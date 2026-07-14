import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createBrotliDecompress } from 'node:zlib'
import tarFs from 'tar-fs'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const starterDir = path.join(root, 'app-starter')
export const benchmarkDir = path.join(root, 'benchmark')
export const runsDir = path.join(root, 'runs')
export const artifactsDir = path.join(root, 'artifacts')
export const adapterDir = path.join(artifactsDir, 'adapters')

export function parseArgs(argv = process.argv.slice(2)) {
  const result = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) {
      result._.push(value)
      continue
    }
    const key = value.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) result[key] = true
    else {
      result[key] = next
      index += 1
    }
  }
  return result
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`)
}

export async function sha256File(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

async function walk(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (['node_modules', 'dist', '.git', '.DS_Store'].includes(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute, base))
    else files.push({ absolute, relative: path.relative(base, absolute).split(path.sep).join('/') })
  }
  return files
}

export async function sha256Directory(directory) {
  const hash = createHash('sha256')
  for (const file of await walk(directory)) {
    hash.update(file.relative)
    hash.update('\0')
    hash.update(await readFile(file.absolute))
    hash.update('\0')
  }
  return hash.digest('hex')
}

export async function modelManifest() {
  return readJson(path.join(benchmarkDir, 'models.json'))
}

export async function getModel(slug) {
  const manifest = await modelManifest()
  const model = manifest.models.find((entry) => entry.slug === slug)
  if (!model) throw new Error(`Unknown model slug: ${slug}`)
  return { manifest, model }
}

export function adapterStatusFile(slug) {
  return path.join(adapterDir, `${slug}.json`)
}

export async function readAdapterStatus(slug) {
  return readJson(adapterStatusFile(slug)).catch(() => null)
}

export function adapterIsVerified(model, status) {
  return Boolean(
    status?.status === 'verified'
    && status?.attemptsPassed === 3
    && status?.attemptsRequired === 3
    && status?.openRouterModelId === model.openRouterModelId
    && status?.expectedCanonicalSlug === model.expectedCanonicalSlug
    && status?.harnessModel === model.harnessModel,
  )
}

export async function fetchOpenRouterCatalog(apiKey = process.env.OPENROUTER_API_KEY) {
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  const response = await fetch('https://openrouter.ai/api/v1/models', { headers })
  if (!response.ok) throw new Error(`OpenRouter Models API returned ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload?.data)) throw new Error('OpenRouter Models API returned an unexpected payload')
  return payload.data
}

export function validateCatalogModel(model, catalog) {
  const route = catalog.find((entry) => entry.id === model.openRouterModelId)
  const problems = []
  if (!route) return { route: null, problems: [`Route ${model.openRouterModelId} is absent`] }
  const canonical = route.canonical_slug || route.canonicalSlug || route.id
  if (canonical !== model.expectedCanonicalSlug) {
    problems.push(`Canonical slug is ${canonical}; expected ${model.expectedCanonicalSlug}`)
  }
  const parameters = route.supported_parameters || route.supportedParameters || []
  for (const required of ['tools', 'tool_choice']) {
    if (!parameters.includes(required)) problems.push(`Missing required parameter support: ${required}`)
  }
  const expiresAt = route.expiration_date || route.expirationDate || null
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) problems.push(`Route expired at ${expiresAt}`)
  return {
    route,
    problems,
    observed: {
      id: route.id,
      canonicalSlug: canonical,
      supportedParameters: parameters,
      pricing: route.pricing || null,
      contextLength: route.context_length || route.contextLength || null,
      expirationDate: expiresAt,
    },
  }
}

export async function recordedSpendUsd() {
  let total = 0
  for (const entry of await readdir(runsDir, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue
    const record = await readJson(path.join(runsDir, entry.name, 'artifacts', 'run-record.json')).catch(() => null)
    if (Number.isFinite(record?.reportedCostUsd)) total += record.reportedCostUsd
  }
  for (const entry of await readdir(adapterDir, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const record = await readJson(path.join(adapterDir, entry.name)).catch(() => null)
    if (Number.isFinite(record?.reportedCostUsd)) total += record.reportedCostUsd
  }
  return total
}

export function extractEventFacts(output) {
  const facts = {
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    toolNames: [],
    commands: [],
    providerRequestIds: [],
    resolvedModelIds: [],
    routerMetadata: [],
  }
  const visit = (value, key = '') => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key)
      return
    }
    if (!value || typeof value !== 'object') return
    if (typeof value.cost === 'number' && (value.type === 'step_finish' || key === 'part')) facts.cost += value.cost
    if (value.tokens && typeof value.tokens === 'object') {
      facts.inputTokens += Number(value.tokens.input || 0)
      facts.outputTokens += Number(value.tokens.output || 0)
      facts.cachedTokens += Number(value.tokens.cache?.read || value.tokens.cached || 0)
    }
    if (typeof value.tool === 'string') facts.toolNames.push(value.tool)
    if (typeof value.command === 'string') facts.commands.push(value.command)
    for (const [childKey, child] of Object.entries(value)) {
      const normalized = childKey.toLowerCase()
      if (typeof child === 'string' && ['request_id', 'requestid', 'provider_request_id'].includes(normalized)) facts.providerRequestIds.push(child)
      if (typeof child === 'string' && ['model', 'model_id', 'modelid', 'resolved_model'].includes(normalized) && child.includes('/')) facts.resolvedModelIds.push(child)
      if (normalized.includes('openrouter') && child && typeof child === 'object') facts.routerMetadata.push(child)
      visit(child, childKey)
    }
  }
  for (const line of String(output).split('\n')) {
    if (!line.trim()) continue
    try { visit(JSON.parse(line)) } catch {}
  }
  for (const key of ['toolNames', 'commands', 'providerRequestIds', 'resolvedModelIds']) facts[key] = [...new Set(facts[key])]
  return facts
}

export async function copyStarter(destination) {
  const destinationState = await stat(destination).catch(() => null)
  if (destinationState) throw new Error(`Refusing to overwrite existing run worktree: ${destination}`)
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(starterDir, destination, {
    recursive: true,
    filter: (source) => !source.split(path.sep).some((part) => ['node_modules', 'dist'].includes(part)),
  })
}

export function isolatedOpenCodeEnv(runId, extra = {}) {
  const stateRoot = path.join(root, 'runs', runId, '.opencode-state')
  return {
    ...process.env,
    HOME: path.join(stateRoot, 'home'),
    XDG_DATA_HOME: path.join(stateRoot, 'data'),
    XDG_CONFIG_HOME: path.join(stateRoot, 'config'),
    XDG_CACHE_HOME: path.join(stateRoot, 'cache'),
    XDG_STATE_HOME: path.join(stateRoot, 'state'),
    NPM_CONFIG_CACHE: '/tmp/siteos-round0-npm-cache',
    npm_config_cache: '/tmp/siteos-round0-npm-cache',
    ...extra,
  }
}

export function npmEnvironment() {
  const cache = '/tmp/siteos-round0-npm-cache'
  return {
    ...process.env,
    HOME: '/tmp/siteos-npm-home',
    NPM_CONFIG_CACHE: cache,
    npm_config_cache: cache,
  }
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: options.env || process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      options.onStdout?.(chunk, child)
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      options.onStderr?.(chunk, child)
    })
    let timedOut = false
    let spawnError = null
    child.on('error', (error) => { spawnError = error })
    const timer = options.timeoutMs ? setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref()
    }, options.timeoutMs) : null
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      resolve({ code, signal, stdout, stderr: spawnError ? `${stderr}\n${spawnError.message}`.trim() : stderr, timedOut, spawnError, elapsedMs: Date.now() - started })
    })
  })
}

export async function ensureDirs(...directories) {
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })))
}

export async function ensureChromiumExecutable() {
  const temporary = tmpdir()
  const chromiumPath = path.join(temporary, 'chromium')
  const glesPath = path.join(temporary, 'libGLESv2.so')
  const fontsPath = path.join(temporary, 'fonts')
  const bin = path.join(root, 'node_modules', '@sparticuz', 'chromium', 'bin')
  const inflateFile = async (source, destination) => {
    if (await stat(destination).catch(() => null)) return
    await pipeline(createReadStream(source), createBrotliDecompress(), createWriteStream(destination, { mode: 0o700 }))
  }
  const inflateTar = async (source, destination, sentinel) => {
    if (await stat(sentinel).catch(() => null)) return
    await mkdir(destination, { recursive: true })
    await pipeline(
      createReadStream(source),
      createBrotliDecompress(),
      tarFs.extract(destination, { chown: false }),
    )
  }
  await inflateFile(path.join(bin, 'chromium.br'), chromiumPath)
  await inflateTar(path.join(bin, 'fonts.tar.br'), fontsPath, path.join(fontsPath, 'fonts.conf'))
  await inflateTar(path.join(bin, 'swiftshader.tar.br'), temporary, glesPath)
  return chromiumPath
}
