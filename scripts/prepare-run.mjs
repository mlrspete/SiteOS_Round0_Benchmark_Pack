import path from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
import {
  benchmarkDir,
  adapterIsVerified,
  copyStarter,
  getModel,
  parseArgs,
  readAdapterStatus,
  readJson,
  root,
  sha256Directory,
  sha256File,
  starterDir,
  npmEnvironment,
  runProcess,
  writeJson,
} from './lib.mjs'

const args = parseArgs()
if (!args.model) throw new Error('Usage: npm run prepare:run -- --model <slug>')

const { model } = await getModel(args.model)
const adapter = await readAdapterStatus(model.slug)
if (!adapterIsVerified(model, adapter)) throw new Error(`Adapter for ${model.slug} is not verified. Run adapter:preflight first.`)
const runOrder = await readJson(path.join(benchmarkDir, 'run-order.json')).catch(() => null)
if (!runOrder) throw new Error('Run order is not frozen. Execute npm run freeze:order after all adapter preflights pass.')
const orderEntry = runOrder.order.find((entry) => entry.slug === model.slug)
if (!orderEntry) throw new Error(`${model.slug} is absent from the frozen run order.`)
const runRoot = path.join(root, 'runs', model.slug)
const worktree = path.join(runRoot, 'worktree')
const artifacts = path.join(runRoot, 'artifacts')
await copyStarter(worktree)
await mkdir(artifacts, { recursive: true })

const install = await runProcess('npm', ['ci', '--ignore-scripts'], {
  cwd: worktree,
  env: npmEnvironment(),
  timeoutMs: 180_000,
})
if (install.code !== 0) throw new Error(`Starter dependency install failed:\n${install.stderr}`)

const prompt = await readFile(path.join(benchmarkDir, 'task-prompt.md'), 'utf8')
const record = {
  runId: model.slug,
  modelSlug: model.slug,
  candidateCode: orderEntry.candidateCode,
  runPosition: orderEntry.position,
  gateway: 'OpenRouter',
  requestedModelId: model.openRouterModelId,
  expectedCanonicalSlug: model.expectedCanonicalSlug,
  harnessModel: model.harnessModel,
  variant: model.variant,
  resolvedModelId: null,
  resolvedCanonicalSlug: null,
  providerRequestId: null,
  routerMetadata: [],
  startedAt: null,
  finishedAt: null,
  status: 'prepared',
  promptSha256: await sha256File(path.join(benchmarkDir, 'task-prompt.md')),
  starterSha256: await sha256Directory(starterDir),
  elapsedMs: null,
  inputTokens: null,
  outputTokens: null,
  cachedTokens: null,
  reportedCostUsd: null,
  exitCode: null,
  agentStepsObserved: null,
  interventions: 0,
  notes: [],
}
await writeJson(path.join(artifacts, 'run-record.json'), record)
await writeJson(path.join(artifacts, 'frozen-input.json'), {
  ...record,
  promptBytes: Buffer.byteLength(prompt),
  appPackageLockSha256: await sha256File(path.join(starterDir, 'package-lock.json')),
  dependencyInstallElapsedMs: install.elapsedMs,
})
console.log(`Prepared ${model.slug} at ${worktree}`)
