import path from 'node:path'
import { readFile, stat, writeFile } from 'node:fs/promises'
import {
  adapterIsVerified,
  benchmarkDir,
  extractEventFacts,
  getModel,
  isolatedOpenCodeEnv,
  parseArgs,
  readAdapterStatus,
  readJson,
  recordedSpendUsd,
  root,
  runProcess,
  writeJson,
} from './lib.mjs'

const args = parseArgs()
if (!args.model) throw new Error('Usage: npm run run:model -- --model <slug> --confirm-paid')
if (!args['confirm-paid']) throw new Error('Paid inference requires --confirm-paid')
if (!process.env.OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY; keep credentials outside the repository.')
const { manifest, model } = await getModel(args.model)
const adapter = await readAdapterStatus(model.slug)
if (!adapterIsVerified(model, adapter)) throw new Error(`${model.slug} requires a current successful three-probe adapter record.`)

const totalBudget = Number(process.env.SITEOS_TOTAL_BUDGET_USD)
const perRunBudget = Number(process.env.SITEOS_PER_RUN_BUDGET_USD)
if (!Number.isFinite(totalBudget) || totalBudget <= 0) throw new Error('Set a positive SITEOS_TOTAL_BUDGET_USD.')
if (!Number.isFinite(perRunBudget) || perRunBudget <= 0) throw new Error('Set a positive SITEOS_PER_RUN_BUDGET_USD.')
const priorSpend = await recordedSpendUsd()
if (priorSpend >= totalBudget) throw new Error(`Total benchmark budget exhausted: $${priorSpend.toFixed(4)} of $${totalBudget.toFixed(2)} recorded.`)
const effectiveRunBudget = Math.min(perRunBudget, totalBudget - priorSpend)

const runRoot = path.join(root, 'runs', model.slug)
const worktree = path.join(runRoot, 'worktree')
const artifacts = path.join(runRoot, 'artifacts')
if (!await stat(worktree).catch(() => null)) throw new Error(`Run is not prepared. Execute npm run prepare:run -- --model ${model.slug}`)
const recordFile = path.join(artifacts, 'run-record.json')
const record = await readJson(recordFile)
if (record.status !== 'prepared') throw new Error(`Refusing to run record in status ${record.status}`)

record.status = 'running'
record.startedAt = new Date().toISOString()
await writeJson(recordFile, record)

const prompt = await readFile(path.join(benchmarkDir, 'task-prompt.md'), 'utf8')
const opencode = path.join(root, 'node_modules', '.bin', 'opencode')
const commandArgs = [
  'run', '--pure', '--format', 'json', '--model', model.harnessModel,
  '--dir', worktree, '--title', `SiteOS Round 0 — ${record.candidateCode}`,
]
if (model.variant) commandArgs.push('--variant', model.variant)
commandArgs.push(prompt)

const eventsFile = path.join(artifacts, 'session-events.jsonl')
const stderrFile = path.join(artifacts, 'agent-stderr.log')
let eventBuffer = ''
let observedCost = 0
let observedSteps = 0
let budgetStopped = false
let stepLimitStopped = false
let hardStopScheduled = false
const stopChild = (child) => {
  if (!child || hardStopScheduled) return
  hardStopScheduled = true
  child.kill('SIGTERM')
  setTimeout(() => child.kill('SIGKILL'), 5_000).unref()
}
const ingestEvent = (line, child) => {
  if (!line.trim()) return
  try {
    const event = JSON.parse(line)
    if (event.type === 'step_finish') observedCost += Number(event.part?.cost || 0)
    if (event.type === 'step_finish') {
      observedSteps += 1
      if (!stepLimitStopped
        && event.part?.reason !== 'stop'
        && observedSteps >= manifest.harness.maxAgentSteps) {
        stepLimitStopped = true
        stopChild(child)
      }
    }
    if (!budgetStopped && observedCost > effectiveRunBudget) {
      budgetStopped = true
      stopChild(child)
    }
  } catch {}
}
const result = await runProcess(opencode, commandArgs, {
  cwd: worktree,
  env: isolatedOpenCodeEnv(model.slug),
  timeoutMs: manifest.harness.wallClockMinutes * 60_000,
  onStdout: (chunk, child) => {
    eventBuffer += chunk.toString()
    const lines = eventBuffer.split('\n')
    eventBuffer = lines.pop() || ''
    for (const line of lines) ingestEvent(line, child)
  },
})
ingestEvent(eventBuffer)
await writeFile(eventsFile, result.stdout)
await writeFile(stderrFile, result.stderr)

const facts = extractEventFacts(result.stdout)
const normalizedIds = facts.resolvedModelIds.map((value) => value.replace(/^openrouter\//, ''))
const allowedIds = new Set([model.openRouterModelId, model.expectedCanonicalSlug])
const providerPrefix = model.openRouterModelId.split('/')[0]
const contradictoryIds = normalizedIds.filter((value) => value.startsWith(`${providerPrefix}/`) && !allowedIds.has(value))

record.finishedAt = new Date().toISOString()
record.elapsedMs = result.elapsedMs
record.exitCode = result.code
record.agentStepsObserved = observedSteps
record.inputTokens = facts.inputTokens || null
record.outputTokens = facts.outputTokens || null
record.cachedTokens = facts.cachedTokens || null
record.reportedCostUsd = facts.cost
record.providerRequestId = facts.providerRequestIds[0] || null
record.resolvedModelId = normalizedIds.find((value) => allowedIds.has(value)) || model.openRouterModelId
record.resolvedCanonicalSlug = model.expectedCanonicalSlug
record.routerMetadata = facts.routerMetadata
record.commandsObserved = facts.commands
record.toolNamesObserved = facts.toolNames
record.status = budgetStopped
  ? 'failed'
  : stepLimitStopped
    ? 'step-limited'
    : result.timedOut
      ? 'timed-out'
      : contradictoryIds.length
        ? 'invalid'
        : result.code === 0
          ? 'completed'
          : 'failed'
if (budgetStopped) record.notes.push(`Runner stopped after reported session cost exceeded the effective $${effectiveRunBudget.toFixed(2)} ceiling.`)
if (stepLimitStopped) record.notes.push(`Runner enforced the frozen ${manifest.harness.maxAgentSteps}-step ceiling.`)
if (contradictoryIds.length) record.notes.push(`Observed contradictory routed model identities: ${contradictoryIds.join(', ')}`)
if (facts.cost === 0) record.notes.push('Gateway telemetry reported zero cost; verify the OpenRouter activity record before treating this run as valid.')
if (!facts.providerRequestIds.length) record.notes.push('No provider request ID was exposed by the harness; retain session events and OpenRouter activity metadata for audit.')
await writeJson(recordFile, record)
console.log(JSON.stringify({
  model: model.slug,
  candidateCode: record.candidateCode,
  status: record.status,
  elapsedMs: record.elapsedMs,
  reportedCostUsd: record.reportedCostUsd,
  agentStepsObserved: record.agentStepsObserved,
  exitCode: record.exitCode,
}, null, 2))
if (!['completed', 'step-limited'].includes(record.status)) process.exitCode = 1
