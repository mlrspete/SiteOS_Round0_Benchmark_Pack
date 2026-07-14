import path from 'node:path'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import {
  adapterDir,
  adapterIsVerified,
  adapterStatusFile,
  extractEventFacts,
  fetchOpenRouterCatalog,
  getModel,
  isolatedOpenCodeEnv,
  modelManifest,
  parseArgs,
  recordedAdapterSpendUsd,
  readJson,
  recordedSpendUsd,
  root,
  runProcess,
  validateCatalogModel,
  writeJson,
} from './lib.mjs'

const args = parseArgs()
if (!args.model && !args.all) throw new Error('Usage: npm run adapter:preflight -- --model <slug> --confirm-paid OR --all --confirm-paid')
if (!args['confirm-paid']) throw new Error('Adapter probes use paid inference; pass --confirm-paid after checking the configured budgets.')
if (!process.env.OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY. Keep it in your shell or untracked .env file.')

const totalBudget = Number(process.env.SITEOS_TOTAL_BUDGET_USD)
const preflightBudget = Number(process.env.SITEOS_PREFLIGHT_BUDGET_USD)
if (!Number.isFinite(totalBudget) || totalBudget <= 0) throw new Error('Set a positive SITEOS_TOTAL_BUDGET_USD.')
if (!Number.isFinite(preflightBudget) || preflightBudget <= 0) throw new Error('Set a positive SITEOS_PREFLIGHT_BUDGET_USD.')

const manifest = await modelManifest()
const selected = args.all ? manifest.models : [(await getModel(String(args.model))).model]
const catalog = await fetchOpenRouterCatalog()
const catalogChecks = new Map()
for (const model of selected) {
  const check = validateCatalogModel(model, catalog)
  if (check.problems.length) throw new Error(`${model.slug} failed catalog validation: ${check.problems.join('; ')}`)
  catalogChecks.set(model.slug, check)
}

await mkdir(adapterDir, { recursive: true })
let preflightSpend = 0
const startingSpend = await recordedSpendUsd()
const startingPreflightSpend = await recordedAdapterSpendUsd()
if (startingSpend >= totalBudget) throw new Error(`Total budget is already exhausted: $${startingSpend.toFixed(4)} recorded.`)
if (startingPreflightSpend >= preflightBudget) throw new Error(`Adapter preflight budget is already exhausted: $${startingPreflightSpend.toFixed(4)} recorded.`)
const opencode = path.join(root, 'node_modules', '.bin', 'opencode')

for (const model of selected) {
  const existing = await stat(adapterStatusFile(model.slug)).then(() => readJson(adapterStatusFile(model.slug))).catch(() => null)
  const historicalCost = Number(existing?.reportedCostUsd || 0)
  if (!args.force && adapterIsVerified(model, existing)) {
    console.log(`${model.slug}: already verified (use --force to repeat)`)
    continue
  }
  const probeRoot = path.join(root, 'artifacts', 'adapter-preflight', model.slug)
  if (args.force) await rm(probeRoot, { recursive: true, force: true })
  const attempts = []
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (startingPreflightSpend + preflightSpend >= preflightBudget) throw new Error(`Adapter preflight budget exhausted at $${(startingPreflightSpend + preflightSpend).toFixed(4)}.`)
    if (startingSpend + preflightSpend >= totalBudget) throw new Error(`Total benchmark budget exhausted at $${(startingSpend + preflightSpend).toFixed(4)}.`)
    const worktree = path.join(probeRoot, `attempt-${attempt}`)
    await rm(worktree, { recursive: true, force: true })
    await mkdir(worktree, { recursive: true })
    await cp(path.join(root, 'app-starter', 'opencode.json'), path.join(worktree, 'opencode.json'))
    await writeFile(path.join(worktree, 'AGENTS.md'), '# Adapter probe\n\nFollow the prompt exactly. Do not access files outside this directory.\n')
    await writeFile(path.join(worktree, 'seed.txt'), `probe=${attempt}\n`)
    const expected = `SITEOS_ADAPTER_OK\nprobe-${attempt}\n`
    const prompt = [
      `This is adapter probe ${attempt} of 3.`,
      `In the current working directory, create probe-result.txt with exactly these bytes: SITEOS_ADAPTER_OK\\nprobe-${attempt}\\n. The final newline after probe-${attempt} is required.`,
      'Use a file-editing tool to create it. Do not use an absolute path. Then use the shell tool to run: node -e "const fs=require(\'fs\');if(fs.readFileSync(\'probe-result.txt\',\'utf8\')!==process.env.EXPECTED)process.exit(1)". If that command fails, correct the file and rerun it before replying.',
      'Do not edit any other file. Reply with only: complete',
    ].join(' ')
    const commandArgs = [
      'run', '--pure', '--format', 'json', '--model', model.harnessModel,
      '--dir', worktree, '--title', `SiteOS adapter probe — ${model.slug} — ${attempt}`,
    ]
    if (model.variant) commandArgs.push('--variant', model.variant)
    commandArgs.push(prompt)
    const result = await runProcess(opencode, commandArgs, {
      cwd: worktree,
      env: isolatedOpenCodeEnv(`adapter-${model.slug}-${attempt}`, { EXPECTED: expected }),
      timeoutMs: 5 * 60_000,
    })
    const facts = extractEventFacts(result.stdout)
    preflightSpend += facts.cost
    const actual = await readFile(path.join(worktree, 'probe-result.txt'), 'utf8').catch(() => null)
    const usedShell = facts.commands.some((command) => command.includes('probe-result.txt'))
    const verificationShells = facts.shellCommands.filter((entry) => entry.command.includes('probe-result.txt'))
    const shellSucceeded = verificationShells.some((entry) => entry.exitCode === 0)
    const passed = result.code === 0 && !result.timedOut && actual === expected && usedShell && shellSucceeded
    await writeFile(path.join(worktree, 'session-events.jsonl'), result.stdout)
    await writeFile(path.join(worktree, 'agent-stderr.log'), result.stderr)
    attempts.push({
      attempt,
      passed,
      exitCode: result.code,
      timedOut: result.timedOut,
      elapsedMs: result.elapsedMs,
      exactFile: actual === expected,
      shellObserved: usedShell,
      shellSucceeded,
      reportedCostUsd: facts.cost,
      inputTokens: facts.inputTokens,
      outputTokens: facts.outputTokens,
      providerRequestIds: facts.providerRequestIds,
      resolvedModelIds: facts.resolvedModelIds,
      routerMetadata: facts.routerMetadata,
    })
    console.log(`${model.slug} probe ${attempt}: ${passed ? 'pass' : 'FAIL'}`)
  }

  const passedCount = attempts.filter((attempt) => attempt.passed).length
  const record = {
    checkedAt: new Date().toISOString(),
    status: passedCount === 3 ? 'verified' : 'failed',
    attemptsRequired: 3,
    attemptsPassed: passedCount,
    openRouterModelId: model.openRouterModelId,
    expectedCanonicalSlug: model.expectedCanonicalSlug,
    harnessModel: model.harnessModel,
    variant: model.variant,
    gatewayPolicy: { allowFallbacks: false, requireParameters: true },
    catalogObserved: catalogChecks.get(model.slug).observed,
    reportedCostUsd: historicalCost + attempts.reduce((sum, attempt) => sum + attempt.reportedCostUsd, 0),
    currentProbeCostUsd: attempts.reduce((sum, attempt) => sum + attempt.reportedCostUsd, 0),
    attempts,
  }
  await writeJson(adapterStatusFile(model.slug), record)
  if (record.status !== 'verified') process.exitCode = 1
}
