import path from 'node:path'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import {
  benchmarkDir,
  getModel,
  isolatedOpenCodeEnv,
  parseArgs,
  readJson,
  root,
  runProcess,
  writeJson,
} from './lib.mjs'

const args = parseArgs()
if (!args.model) throw new Error('Usage: npm run run:model -- --model <slug> --confirm-paid')
const { manifest, model } = await getModel(args.model)
if (model.adapterStatus !== 'verified') throw new Error(`${model.slug} adapter is ${model.adapterStatus}; a scored run requires three successful preflight probes and adapterStatus=verified.`)
if (!model.harnessModel) throw new Error(`${model.slug} has no validated harnessModel. Complete adapter preflight and freeze the exact ID first.`)
if (model.credentialEnv && !process.env[model.credentialEnv]) throw new Error(`Missing ${model.credentialEnv}; do not paste secrets into the repository or chat.`)
if (model.credentialEnv && !args['confirm-paid']) throw new Error('Paid inference requires --confirm-paid')
const budget = Number(process.env.SITEOS_TOTAL_BUDGET_USD)
if (model.credentialEnv && (!Number.isFinite(budget) || budget <= 0)) throw new Error('Set a positive SITEOS_TOTAL_BUDGET_USD before paid inference.')
const perRunBudget = Number(process.env.SITEOS_PER_RUN_BUDGET_USD)
if (model.credentialEnv && (!Number.isFinite(perRunBudget) || perRunBudget <= 0)) throw new Error('Set a positive SITEOS_PER_RUN_BUDGET_USD before paid inference.')

let priorSpend = 0
for (const entry of await readdir(path.join(root, 'runs'), { withFileTypes: true }).catch(() => [])) {
  if (!entry.isDirectory()) continue
  const prior = await readJson(path.join(root, 'runs', entry.name, 'artifacts', 'run-record.json')).catch(() => null)
  if (Number.isFinite(prior?.reportedCostUsd)) priorSpend += prior.reportedCostUsd
}
if (model.credentialEnv && priorSpend >= budget) throw new Error(`Total benchmark budget exhausted: $${priorSpend.toFixed(4)} of $${budget.toFixed(2)} recorded.`)
const effectiveRunBudget = model.credentialEnv ? Math.min(perRunBudget, budget - priorSpend) : Infinity

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
  'run',
  '--pure',
  '--format', 'json',
  '--model', model.harnessModel,
  '--dir', worktree,
  '--title', `SiteOS Round 0 — ${model.slug}`,
]
if (model.variant) commandArgs.push('--variant', model.variant)
commandArgs.push(prompt)

const eventsFile = path.join(artifacts, 'session-events.jsonl')
const stderrFile = path.join(artifacts, 'agent-stderr.log')
let eventBuffer = ''
let observedCost = 0
let inputTokens = 0
let outputTokens = 0
let cachedTokens = 0
let budgetStopped = false
const ingestEvent = (line) => {
  if (!line.trim()) return
  try {
    const event = JSON.parse(line)
    if (event.type !== 'step_finish') return
    observedCost += Number(event.part?.cost || 0)
    inputTokens += Number(event.part?.tokens?.input || 0)
    outputTokens += Number(event.part?.tokens?.output || 0)
    cachedTokens += Number(event.part?.tokens?.cache?.read || 0)
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
    for (const line of lines) ingestEvent(line)
    if (!budgetStopped && observedCost > effectiveRunBudget) {
      budgetStopped = true
      child.kill('SIGTERM')
    }
  },
})
ingestEvent(eventBuffer)
await writeFile(eventsFile, result.stdout)
await writeFile(stderrFile, result.stderr)

record.finishedAt = new Date().toISOString()
record.elapsedMs = result.elapsedMs
record.exitCode = result.code
record.inputTokens = inputTokens || null
record.outputTokens = outputTokens || null
record.cachedTokens = cachedTokens || null
record.reportedCostUsd = observedCost
record.status = budgetStopped ? 'failed' : result.timedOut ? 'timed-out' : result.code === 0 ? 'completed' : 'failed'
if (budgetStopped) record.notes.push(`Runner stopped after reported session cost exceeded the effective $${effectiveRunBudget.toFixed(2)} ceiling.`)
if (model.credentialEnv && observedCost === 0) record.notes.push('Provider cost telemetry reported zero; invalidate the run unless authenticated billing evidence confirms zero cost.')
await writeJson(recordFile, record)
console.log(JSON.stringify({ model: model.slug, status: record.status, elapsedMs: record.elapsedMs, exitCode: record.exitCode }, null, 2))
if (record.status !== 'completed') process.exitCode = 1
