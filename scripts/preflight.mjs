import path from 'node:path'
import { access } from 'node:fs/promises'
import {
  benchmarkDir,
  modelManifest,
  root,
  runProcess,
  npmEnvironment,
  sha256Directory,
  sha256File,
  starterDir,
  writeJson,
} from './lib.mjs'

const manifest = await modelManifest()
const errors = []

if (manifest.models.length !== 14) errors.push(`Expected 14 models, found ${manifest.models.length}`)
const slugs = new Set(manifest.models.map((model) => model.slug))
if (slugs.size !== 14) errors.push('Model slugs are not unique')

for (const required of ['package.json', 'package-lock.json', 'PRODUCT_CONTRACT.md', 'AGENTS.md', 'opencode.json']) {
  await access(path.join(starterDir, required)).catch(() => errors.push(`Missing app-starter/${required}`))
}

const opencode = path.join(root, 'node_modules', '.bin', 'opencode')
const version = await runProcess(opencode, ['--version'], {
  env: {
    ...process.env,
    HOME: '/tmp/siteos-preflight/home',
    XDG_DATA_HOME: '/tmp/siteos-preflight/data',
    XDG_CONFIG_HOME: '/tmp/siteos-preflight/config',
    XDG_CACHE_HOME: '/tmp/siteos-preflight/cache',
    XDG_STATE_HOME: '/tmp/siteos-preflight/state',
  },
})
if (version.code !== 0 || !version.stdout.includes(manifest.harness.version)) {
  errors.push(`OpenCode ${manifest.harness.version} not available (reported: ${version.stdout.trim() || version.stderr.trim()})`)
}

const starterInstall = await runProcess('npm', ['ci', '--ignore-scripts'], {
  cwd: starterDir,
  env: npmEnvironment(),
  timeoutMs: 180_000,
})
if (starterInstall.code !== 0) errors.push('Starter npm ci failed')
const starterCheck = starterInstall.code === 0
  ? await runProcess('npm', ['run', 'check'], { cwd: starterDir, env: npmEnvironment(), timeoutMs: 180_000 })
  : { code: null }
if (starterCheck.code !== 0) errors.push('Starter type check failed')
const starterBuild = starterCheck.code === 0
  ? await runProcess('npm', ['run', 'build'], { cwd: starterDir, env: npmEnvironment(), timeoutMs: 180_000 })
  : { code: null }
if (starterBuild.code !== 0) errors.push('Starter production build failed')

const models = manifest.models.map((model) => ({
  slug: model.slug,
  company: model.company,
  requestedModelId: model.requestedModelId,
  harnessModel: model.harnessModel,
  adapterStatus: model.adapterStatus,
  credentialEnv: model.credentialEnv,
  credentialPresent: model.credentialEnv ? Boolean(process.env[model.credentialEnv]) : true,
  runnable: Boolean(model.adapterStatus === 'verified' && model.harnessModel && (!model.credentialEnv || process.env[model.credentialEnv])),
}))

const report = {
  checkedAt: new Date().toISOString(),
  validPack: errors.length === 0,
  errors,
  harness: { expected: manifest.harness.version, actual: version.stdout.trim() },
  starterValidation: {
    installPassed: starterInstall.code === 0,
    checkPassed: starterCheck.code === 0,
    buildPassed: starterBuild.code === 0,
  },
  promptSha256: await sha256File(path.join(benchmarkDir, 'task-prompt.md')),
  starterSha256: await sha256Directory(starterDir),
  budgetConfigured: Boolean(process.env.SITEOS_TOTAL_BUDGET_USD),
  runnableModels: models.filter((model) => model.runnable).length,
  models,
}

await writeJson(path.join(root, 'artifacts', 'preflight-status.json'), report)
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1
