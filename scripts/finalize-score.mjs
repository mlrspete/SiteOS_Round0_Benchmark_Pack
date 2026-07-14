import path from 'node:path'
import { readFile, readdir } from 'node:fs/promises'
import { getModel, parseArgs, readJson, root, writeJson } from './lib.mjs'

const args = parseArgs()
if (!args.model) throw new Error('Usage: npm run score -- --model <slug>')
const { model } = await getModel(args.model)
const artifacts = path.join(root, 'runs', model.slug, 'artifacts')
const evaluationFile = path.join(artifacts, 'evaluation-summary.json')
const record = await readJson(path.join(artifacts, 'run-record.json'))
const summary = await readJson(evaluationFile)
const reviewFiles = (await readdir(artifacts)).filter((name) => /^manual-review-.+\.json$/.test(name))
const reviews = await Promise.all(reviewFiles.map((name) => readJson(path.join(artifacts, name))))
if (reviews.length < 2) throw new Error(`${model.slug} needs two independent blind reviews; found ${reviews.length}.`)
if (new Set(reviews.map((review) => review.reviewer)).size !== reviews.length) throw new Error('Reviewer codes must be unique.')
const firstTwo = reviews.slice(0, 2)
const needsThird = Math.abs(firstTwo[0].visual - firstTwo[1].visual) > 4 || Math.abs(firstTwo[0].code - firstTwo[1].code) > 3
if (needsThird && reviews.length < 3) throw new Error('A third blind review is required because the first two scores exceed the disagreement threshold.')

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const visual = median(reviews.map((review) => Number(review.visual)))
const code = median(reviews.map((review) => Number(review.code)))

const commands = record.commandsObserved || []
const ranCheck = commands.some((command) => /npm\s+(run\s+)?check\b/.test(command))
const ranBuild = commands.some((command) => /npm\s+(run\s+)?build\b/.test(command))
const progress = await readFile(path.join(root, 'runs', model.slug, 'worktree', 'PROGRESS.md'), 'utf8').catch(() => '')
const progressTruthful = /- \[x\] Type check/i.test(progress)
  && /- \[x\] Production build/i.test(progress)
  && /npm run check/i.test(progress)
  && /npm run build/i.test(progress)
const verification = (ranCheck ? 2 : 0) + (ranBuild ? 2 : 0) + (progressTruthful ? 1 : 0)

let efficiency = 0
if (record.status === 'completed' && record.interventions === 0) efficiency += 2
if (Number.isFinite(record.elapsedMs) && record.elapsedMs <= 20 * 60_000) efficiency += 1
else if (Number.isFinite(record.elapsedMs) && record.elapsedMs <= 30 * 60_000) efficiency += 0.5
if (record.exitCode === 0 && !['failed', 'timed-out', 'invalid'].includes(record.status)) efficiency += 1
if (Number.isFinite(record.reportedCostUsd) && record.reportedCostUsd <= 5) efficiency += 1
else if (Number.isFinite(record.reportedCostUsd) && record.reportedCostUsd <= 10) efficiency += 0.5

summary.manualVisualScore = visual
summary.manualCodeScore = code
summary.verificationScore = verification
summary.efficiencyScore = efficiency
summary.manualReviews = reviews.map(({ candidateCode, reviewer, visual: visualScore, code: codeScore, confidence }) => ({
  candidateCode, reviewer, visual: visualScore, code: codeScore, confidence,
}))
summary.thirdReviewRequired = needsThird
summary.objectiveScoreEvidence = {
  verification: { ranCheck, ranBuild, progressTruthful },
  efficiency: {
    completedWithoutIntervention: record.status === 'completed' && record.interventions === 0,
    elapsedMs: record.elapsedMs,
    cleanExit: record.exitCode === 0,
    reportedCostUsd: record.reportedCostUsd,
  },
}
const raw = summary.automatedScore + visual + code + verification + efficiency
summary.rawScore = raw
summary.totalScore = summary.hardGatePassed ? raw : Math.min(raw, 49)
summary.capped = !summary.hardGatePassed && raw > 49
await writeJson(evaluationFile, summary)
console.log(JSON.stringify({
  candidateCode: record.candidateCode,
  automated: summary.automatedScore,
  visual,
  code,
  verification,
  efficiency,
  raw,
  total: summary.totalScore,
  capped: summary.capped,
}, null, 2))
