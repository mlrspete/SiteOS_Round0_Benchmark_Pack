import path from 'node:path'
import { stat } from 'node:fs/promises'
import { benchmarkDir, parseArgs, readJson, root, runProcess, writeJson } from './lib.mjs'

const args = parseArgs()
if (!args['confirm-paid']) throw new Error('Usage: npm run run:round0 -- --confirm-paid')
if (!process.env.OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY.')
const orderFile = path.join(benchmarkDir, 'run-order.json')
const order = await readJson(orderFile).catch(() => null)
if (!order) throw new Error('Run order is not frozen. Run adapter preflight, then freeze:order.')

const outcomes = []
const invoke = (script, scriptArgs, timeoutMs) => runProcess(process.execPath, [path.join(root, 'scripts', script), ...scriptArgs], {
  cwd: root,
  env: process.env,
  timeoutMs,
  onStdout: (chunk) => process.stdout.write(chunk),
  onStderr: (chunk) => process.stderr.write(chunk),
})

for (const entry of order.order) {
  const recordFile = path.join(root, 'runs', entry.slug, 'artifacts', 'run-record.json')
  const evaluationFile = path.join(root, 'runs', entry.slug, 'artifacts', 'evaluation-summary.json')
  let record = await stat(recordFile).then(() => readJson(recordFile)).catch(() => null)
  if (!record) {
    const prepared = await invoke('prepare-run.mjs', ['--model', entry.slug], 5 * 60_000)
    if (prepared.code !== 0) {
      outcomes.push({ slug: entry.slug, candidateCode: entry.candidateCode, stage: 'prepare', status: 'failed' })
      continue
    }
    record = await readJson(recordFile)
  }
  if (record.status === 'prepared') {
    await invoke('run-model.mjs', ['--model', entry.slug, '--confirm-paid'], 35 * 60_000)
    record = await readJson(recordFile)
  }
  const evaluation = await stat(evaluationFile).then(() => readJson(evaluationFile)).catch(() => null)
  if (!evaluation) await invoke('evaluate-run.mjs', ['--model', entry.slug], 10 * 60_000)
  outcomes.push({ slug: entry.slug, candidateCode: entry.candidateCode, runStatus: record.status, evaluated: true })
}

await writeJson(path.join(root, 'artifacts', 'round0-run-summary.json'), {
  finishedAt: new Date().toISOString(),
  outcomes,
})
console.log(JSON.stringify(outcomes, null, 2))
