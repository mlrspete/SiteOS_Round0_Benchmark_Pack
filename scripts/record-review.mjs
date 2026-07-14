import path from 'node:path'
import { benchmarkDir, parseArgs, readJson, root, writeJson } from './lib.mjs'

const args = parseArgs()
if (!args.candidate || !args.reviewer) throw new Error('Usage: npm run review:record -- --candidate C-0000 --reviewer R1 --visual 0-20 --code 0-10 [--confidence high] [--notes "..."]')
const visual = Number(args.visual)
const code = Number(args.code)
if (!Number.isFinite(visual) || visual < 0 || visual > 20) throw new Error('visual must be between 0 and 20')
if (!Number.isFinite(code) || code < 0 || code > 10) throw new Error('code must be between 0 and 10')
const reviewer = String(args.reviewer).replace(/[^a-zA-Z0-9_-]/g, '')
if (!reviewer) throw new Error('reviewer code is invalid')
const confidence = String(args.confidence || 'medium').toLowerCase()
if (!['low', 'medium', 'high'].includes(confidence)) throw new Error('confidence must be low, medium or high')
const order = await readJson(path.join(benchmarkDir, 'run-order.json'))
const entry = order.order.find((item) => item.candidateCode === args.candidate)
if (!entry) throw new Error(`Unknown candidate code: ${args.candidate}`)
const file = path.join(root, 'runs', entry.slug, 'artifacts', `manual-review-${reviewer}.json`)
await writeJson(file, {
  candidateCode: args.candidate,
  reviewer,
  reviewedAt: new Date().toISOString(),
  visual,
  code,
  confidence,
  notes: String(args.notes || ''),
})
console.log(`Recorded ${args.candidate} review from ${reviewer}`)
