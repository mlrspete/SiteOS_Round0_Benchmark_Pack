import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const starterDir = path.join(root, 'app-starter')
export const benchmarkDir = path.join(root, 'benchmark')
export const runsDir = path.join(root, 'runs')

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
    const timer = options.timeoutMs ? setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref()
    }, options.timeoutMs) : null
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      resolve({ code, signal, stdout, stderr, timedOut, elapsedMs: Date.now() - started })
    })
  })
}

export async function ensureDirs(...directories) {
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })))
}
