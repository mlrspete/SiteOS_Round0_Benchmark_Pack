import path from 'node:path'
import { access } from 'node:fs/promises'
import {
  adapterIsVerified,
  artifactsDir,
  benchmarkDir,
  fetchOpenRouterCatalog,
  modelManifest,
  npmEnvironment,
  readAdapterStatus,
  root,
  runProcess,
  sha256Directory,
  sha256File,
  starterDir,
  validateCatalogModel,
  writeJson,
} from './lib.mjs'

const manifest = await modelManifest()
const errors = []
const warnings = []

if (manifest.schemaVersion !== 2) errors.push(`Expected manifest schemaVersion 2, found ${manifest.schemaVersion}`)
const qualification = manifest.qualification || {}
const excludedModels = qualification.excludedModels || []
const expectedActiveCount = qualification.activeCount
if (!Number.isInteger(expectedActiveCount) || manifest.models.length !== expectedActiveCount) {
  errors.push(`Expected ${expectedActiveCount ?? 'a declared number of'} active models, found ${manifest.models.length}`)
}
if (new Set(manifest.models.map((model) => model.slug)).size !== manifest.models.length) errors.push('Active model slugs are not unique')
if (new Set(manifest.models.map((model) => model.company)).size !== manifest.models.length) errors.push('The active cohort must contain different companies')
if (qualification.requiredProbePasses !== 3 || qualification.probeAttempts !== 3) errors.push('Expected a frozen three-of-three adapter qualification gate')
if (qualification.originalCandidateCount !== manifest.models.length + excludedModels.length) {
  errors.push('Original candidate count does not equal active plus excluded models')
}
if (new Set([...manifest.models, ...excludedModels].map((model) => model.slug)).size !== qualification.originalCandidateCount) {
  errors.push('Candidate slugs are not unique across active and excluded models')
}
for (const model of manifest.models) {
  for (const field of ['slug', 'company', 'model', 'openRouterModelId', 'expectedCanonicalSlug', 'harnessModel']) {
    if (!model[field]) errors.push(`${model.slug || 'unknown model'} is missing ${field}`)
  }
  if (model.harnessModel !== `openrouter/${model.openRouterModelId}`) errors.push(`${model.slug} has a mismatched OpenCode route`)
}

for (const required of ['package.json', 'package-lock.json', 'PRODUCT_CONTRACT.md', 'AGENTS.md', 'PROGRESS.md', 'opencode.json']) {
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
const ffmpeg = await runProcess('ffmpeg', ['-version'], { timeoutMs: 10_000 })
if (ffmpeg.code !== 0) errors.push('ffmpeg is required to encode blinded interaction evidence. Install ffmpeg and rerun preflight.')

let catalog = null
let catalogError = null
try {
  catalog = await fetchOpenRouterCatalog()
} catch (error) {
  catalogError = error.message
  warnings.push(`Live OpenRouter catalog was not reachable: ${error.message}`)
}

const models = []
for (const model of manifest.models) {
  const adapter = await readAdapterStatus(model.slug)
  const catalogCheck = catalog ? validateCatalogModel(model, catalog) : { route: null, problems: ['Catalog not checked'], observed: null }
  if (catalog && catalogCheck.problems.length) warnings.push(`${model.slug}: ${catalogCheck.problems.join('; ')}`)
  models.push({
    slug: model.slug,
    company: model.company,
    openRouterModelId: model.openRouterModelId,
    expectedCanonicalSlug: model.expectedCanonicalSlug,
    harnessModel: model.harnessModel,
    catalogValid: Boolean(catalogCheck.route && catalogCheck.problems.length === 0),
    catalogObserved: catalogCheck.observed || null,
    adapterStatus: adapter?.status || 'not-run',
    adapterVerified: adapterIsVerified(model, adapter),
  })
}

const gatewayReady = Boolean(process.env.OPENROUTER_API_KEY)
  && Boolean(catalog)
  && models.every((model) => model.catalogValid)
const adaptersReady = models.every((model) => model.adapterVerified)
const report = {
  checkedAt: new Date().toISOString(),
  validPack: errors.length === 0,
  round0Ready: errors.length === 0 && gatewayReady && adaptersReady,
  errors,
  warnings,
  harness: { expected: manifest.harness.version, actual: version.stdout.trim() },
  starterValidation: {
    installPassed: starterInstall.code === 0,
    checkPassed: starterCheck.code === 0,
    buildPassed: starterBuild.code === 0,
  },
  evidenceRuntime: { ffmpegAvailable: ffmpeg.code === 0 },
  promptSha256: await sha256File(path.join(benchmarkDir, 'task-prompt.md')),
  starterSha256: await sha256Directory(starterDir),
  gateway: {
    name: 'OpenRouter',
    credentialPresent: Boolean(process.env.OPENROUTER_API_KEY),
    catalogChecked: Boolean(catalog),
    catalogError,
    ready: gatewayReady,
  },
  budgetConfigured: Boolean(process.env.SITEOS_TOTAL_BUDGET_USD && process.env.SITEOS_PER_RUN_BUDGET_USD),
  verifiedAdapters: models.filter((model) => model.adapterVerified).length,
  models,
}

await writeJson(path.join(artifactsDir, 'preflight-status.json'), report)
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1
