import path from 'node:path'
import { getModel, parseArgs, readJson, root, writeJson } from './lib.mjs'

const args = parseArgs()
if (!args.model) throw new Error('Usage: npm run score -- --model <slug> --visual 0-20 --code 0-10 --verification 0-5 --efficiency 0-5 --reviewers "R1,R2"')
const { model } = await getModel(args.model)
const values = {
  visual: Number(args.visual),
  code: Number(args.code),
  verification: Number(args.verification),
  efficiency: Number(args.efficiency),
}
for (const [name, maximum] of Object.entries({ visual: 20, code: 10, verification: 5, efficiency: 5 })) {
  if (!Number.isFinite(values[name]) || values[name] < 0 || values[name] > maximum) throw new Error(`${name} must be between 0 and ${maximum}`)
}
const reviewers = String(args.reviewers || '').split(',').map((value) => value.trim()).filter(Boolean)
if (reviewers.length < 2) throw new Error('At least two reviewer codes are required.')
const file = path.join(root, 'runs', model.slug, 'artifacts', 'evaluation-summary.json')
const summary = await readJson(file)
summary.manualVisualScore = values.visual
summary.manualCodeScore = values.code
summary.verificationScore = values.verification
summary.efficiencyScore = values.efficiency
summary.reviewers = reviewers
const raw = summary.automatedScore + values.visual + values.code + values.verification + values.efficiency
summary.totalScore = summary.hardGatePassed ? raw : Math.min(raw, 49)
summary.capped = !summary.hardGatePassed && raw > 49
await writeJson(file, summary)
console.log(JSON.stringify({ model: model.slug, raw, total: summary.totalScore, capped: summary.capped }, null, 2))
