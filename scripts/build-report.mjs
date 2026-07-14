import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { modelManifest, readJson, root } from './lib.mjs'

const manifest = await modelManifest()
const rows = []
for (const model of manifest.models) {
  const recordFile = path.join(root, 'runs', model.slug, 'artifacts', 'run-record.json')
  const evaluationFile = path.join(root, 'runs', model.slug, 'artifacts', 'evaluation-summary.json')
  const record = await stat(recordFile).then(() => readJson(recordFile)).catch(() => null)
  const evaluation = await stat(evaluationFile).then(() => readJson(evaluationFile)).catch(() => null)
  rows.push({ model, record, evaluation, total: evaluation?.totalScore })
}
rows.sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.model.order - b.model.order)

const completed = rows.filter((row) => row.total != null)
const recordedCost = rows.reduce((sum, row) => sum + (Number(row.record?.reportedCostUsd) || 0), 0)
const lines = [
  '# SiteOS Round 0 results',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Harness: OpenCode ${manifest.harness.version} pure mode through OpenRouter; ${manifest.harness.wallClockMinutes}-minute ceiling; one scored attempt per model.`,
  '',
  `Scored runs: ${completed.length} / ${rows.length}. Recorded scored-run cost: $${recordedCost.toFixed(4)} USD (adapter probes excluded).`,
  '',
  '> A blank score means the model has not completed the frozen run and blind review. “Not testable” is preferable to silently substituting a route or harness.',
  '',
  '| Rank | Company | Model | Status | Gate | Auto /60 | Visual /20 | Code /10 | Verify /5 | Efficiency /5 | Minutes | Cost USD | Total /100 |',
  '|---:|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
]
let rank = 0
for (const row of rows) {
  if (row.total != null) rank += 1
  const minutes = Number.isFinite(row.record?.elapsedMs) ? (row.record.elapsedMs / 60_000).toFixed(1) : '—'
  const cost = Number.isFinite(row.record?.reportedCostUsd) ? row.record.reportedCostUsd.toFixed(4) : '—'
  const evaluationStatus = row.evaluation?.validEvaluation === false
    ? 'invalid'
    : row.evaluation
      ? (row.evaluation.hardGatePassed ? 'pass' : 'fail')
      : '—'
  lines.push(`| ${row.total == null ? '—' : rank} | ${row.model.company} | ${row.model.model} | ${row.record?.status || 'not run'} | ${evaluationStatus} | ${row.evaluation?.validEvaluation === false ? '—' : (row.evaluation?.automatedScore ?? '—')} | ${row.evaluation?.manualVisualScore ?? '—'} | ${row.evaluation?.manualCodeScore ?? '—'} | ${row.evaluation?.verificationScore ?? '—'} | ${row.evaluation?.efficiencyScore ?? '—'} | ${minutes} | ${cost} | ${row.total ?? '—'} |`)
}
lines.push(
  '',
  '## Cohort disclosure',
  '',
  `The original ${manifest.qualification.originalCandidateCount} candidates were filtered by a frozen ${manifest.qualification.requiredProbePasses}/${manifest.qualification.probeAttempts} adapter gate. These ${manifest.qualification.excludedModels.length} candidates did not enter the ranked benchmark; their outcomes are compatibility/reliability findings, not coding-quality scores.`,
  '',
  '| Company | Model | Probe result | Disposition |',
  '|---|---|---:|---|',
)
for (const excluded of manifest.qualification.excludedModels) {
  lines.push(`| ${excluded.company} | ${excluded.model} | ${excluded.probeResult} | ${excluded.disposition} |`)
}
lines.push(
  '',
  'Meta Muse Spark 1.1 was replaced before the original freeze because it was absent from the live OpenRouter model catalogue. Meta Llama 4 Maverick is the disclosed Meta entrant; it is not presented as the same model.',
  '',
  '## Advancement',
  '',
  'Round 0 advancement is decided only after every testable model finishes blind review. The top five gate-eligible models plus any eligible model within three points of fifth advance to three-run Round 1. This breadth screen does not establish a universal coding-model champion.',
  '',
)

const output = path.join(root, 'ROUND0_RESULTS.md')
await writeFile(output, `${lines.join('\n')}\n`)
console.log(output)
