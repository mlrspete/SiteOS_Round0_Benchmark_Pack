import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { modelManifest, readJson, root } from './lib.mjs'
import { writeFile } from 'node:fs/promises'

const manifest = await modelManifest()
const rows = []
for (const model of manifest.models) {
  const recordFile = path.join(root, 'runs', model.slug, 'artifacts', 'run-record.json')
  const evaluationFile = path.join(root, 'runs', model.slug, 'artifacts', 'evaluation-summary.json')
  const record = await stat(recordFile).then(() => readJson(recordFile)).catch(() => null)
  const evaluation = await stat(evaluationFile).then(() => readJson(evaluationFile)).catch(() => null)
  const total = evaluation?.totalScore
  rows.push({ model, record, evaluation, total })
}

rows.sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.model.order - b.model.order)
const generatedAt = new Date().toISOString()
const lines = [
  '# SiteOS Round 0 results',
  '',
  `Generated: ${generatedAt}`,
  '',
  '> A blank score means the model has not completed the frozen run and review. “Not testable” is preferable to silently substituting a model or harness.',
  '',
  '| Rank | Company | Model | Run status | Hard gate | Automated / 60 | Total / 100 |',
  '|---:|---|---|---|---|---:|---:|',
]
let rank = 0
for (const row of rows) {
  if (row.total != null) rank += 1
  lines.push(`| ${row.total == null ? '—' : rank} | ${row.model.company} | ${row.model.model} | ${row.record?.status || 'not run'} | ${row.evaluation ? (row.evaluation.hardGatePassed ? 'pass' : 'fail') : '—'} | ${row.evaluation?.automatedScore ?? '—'} | ${row.total ?? '—'} |`)
}
lines.push('', '## Advancement', '', 'Round 0 advancement is not decided until all testable models finish blind review. The top five eligible models plus any model within three points of fifth advance to three-run Round 1.', '')

const output = path.join(root, 'ROUND0_RESULTS.md')
await writeFile(output, `${lines.join('\n')}\n`)
console.log(output)
