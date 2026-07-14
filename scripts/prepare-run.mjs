import path from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
import {
  benchmarkDir,
  copyStarter,
  getModel,
  parseArgs,
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
  requestedModelId: model.requestedModelId,
  resolvedModelId: null,
  providerRequestId: null,
  startedAt: new Date().toISOString(),
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
