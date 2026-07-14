import path from 'node:path'
import { readJson, root, runProcess, writeJson } from './lib.mjs'

const label = 'starter-calibration'
const result = await runProcess(process.execPath, [
  path.join(root, 'scripts', 'evaluate-run.mjs'),
  '--path', 'app-starter',
  '--label', label,
], { cwd: root, timeoutMs: 10 * 60_000 })

const summaryFile = path.join(root, 'artifacts', label, 'artifacts', 'evaluation-summary.json')
const summary = await readJson(summaryFile).catch(() => null)
const requiredGateFailures = ['F02A', 'F03', 'F04', 'F05']
const failedIds = new Set(summary?.failedChecks?.map((check) => check.id) || [])
const scoredChecks = (summary?.passedChecks?.length || 0) + (summary?.failedChecks?.filter((check) => check.id !== 'EVALUATOR').length || 0)
const checks = {
  evaluatorProducedSummary: Boolean(summary),
  starterInstalls: summary?.installPassed === true,
  starterBuilds: summary?.buildPassed === true,
  negativeControlFailsHardGate: summary?.hardGatePassed === false,
  negativeControlScoreBelow35: Number(summary?.automatedScore) < 35,
  negativeControlMatchesReferenceScore: summary?.automatedScore === 26,
  missingCoreJourneysDetected: requiredGateFailures.every((id) => failedIds.has(id)),
  allScoredChecksExecuted: scoredChecks === 15,
  noInfrastructureFailure: summary?.validEvaluation === true
    && !failedIds.has('EVALUATOR')
    && (summary?.infrastructureFailures?.length || 0) === 0,
  evaluatorReturnedNonZero: result.code !== 0,
}
const passed = Object.values(checks).every(Boolean)
const verdict = {
  calibratedAt: new Date().toISOString(),
  passed,
  purpose: 'Negative-control calibration: the deliberately incomplete starter must build but fail the core journey gates.',
  checks,
  automatedScore: summary?.automatedScore ?? null,
  failedChecks: summary?.failedChecks ?? [],
  evaluatorExitCode: result.code,
}
await writeJson(path.join(root, 'artifacts', 'calibration-verdict.json'), verdict)
console.log(JSON.stringify(verdict, null, 2))
if (!passed) process.exitCode = 1
