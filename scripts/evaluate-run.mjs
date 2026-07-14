import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  getModel,
  npmEnvironment,
  parseArgs,
  root,
  runProcess,
  writeJson,
} from './lib.mjs'

const args = parseArgs()
if (!args.model && !args.path) throw new Error('Usage: npm run evaluate -- --model <slug> OR --path <worktree> --label <name>')
const model = args.model ? (await getModel(args.model)).model : { slug: String(args.label || 'calibration') }
const runRoot = args.path ? path.join(root, 'artifacts', model.slug) : path.join(root, 'runs', model.slug)
const worktree = args.path ? path.resolve(root, String(args.path)) : path.join(runRoot, 'worktree')
const artifacts = path.join(runRoot, 'artifacts')
const screenshots = path.join(artifacts, 'screenshots')
if (!await stat(worktree).catch(() => null)) throw new Error(`Missing run worktree: ${worktree}`)
await mkdir(screenshots, { recursive: true })

const npmEnv = npmEnvironment()
const install = await runProcess('npm', ['ci', '--ignore-scripts'], { cwd: worktree, env: npmEnv, timeoutMs: 180_000 })
await writeFile(path.join(artifacts, 'npm-ci.log'), `${install.stdout}\n${install.stderr}`)
const build = install.code === 0
  ? await runProcess('npm', ['run', 'build'], { cwd: worktree, env: npmEnv, timeoutMs: 180_000 })
  : { code: null, stdout: '', stderr: 'Skipped because npm ci failed', elapsedMs: 0 }
await writeFile(path.join(artifacts, 'build.log'), `${build.stdout}\n${build.stderr}`)

const summary = {
  evaluatedAt: new Date().toISOString(),
  modelSlug: model.slug,
  installPassed: install.code === 0,
  buildPassed: build.code === 0,
  journeyPassed: false,
  hardGatePassed: false,
  automatedScore: 0,
  automatedMaximum: 60,
  passedChecks: [],
  failedChecks: [],
  manualVisualScore: null,
  manualCodeScore: null,
  verificationScore: null,
  efficiencyScore: null,
  totalScore: null,
  capped: false,
}

if (build.code === 0) {
  const port = 4200 + Math.floor(Math.random() * 500)
  const baseUrl = `http://127.0.0.1:${port}`
  const preview = await import('node:child_process').then(({ spawn }) => spawn(
    path.join(worktree, 'node_modules', '.bin', 'vite'), ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: worktree, env: npmEnv, stdio: ['ignore', 'pipe', 'pipe'] },
  ))
  let previewLog = ''
  preview.stdout.on('data', (chunk) => { previewLog += chunk })
  preview.stderr.on('data', (chunk) => { previewLog += chunk })
  try {
    let ready = false
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}/`)
        if (response.ok) { ready = true; break }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    if (!ready) throw new Error('Preview did not become ready')
    const originalLdLibraryPath = process.env.LD_LIBRARY_PATH
    const { default: chromium } = await import('@sparticuz/chromium')
    const executablePath = await chromium.executablePath()
    if (originalLdLibraryPath === undefined) delete process.env.LD_LIBRARY_PATH
    else process.env.LD_LIBRARY_PATH = originalLdLibraryPath
    const testRun = await runProcess(
      path.join(root, 'node_modules', '.bin', 'playwright'),
      ['test', '--config', path.join(root, 'evaluator', 'playwright.config.mjs')],
      {
        cwd: path.join(root, 'evaluator'),
        env: {
          ...process.env,
          HOME: '/tmp/siteos-browser-home',
          XDG_CACHE_HOME: '/tmp/siteos-font-cache',
          FONTCONFIG_PATH: '/tmp/fonts',
          PLAYWRIGHT_EXECUTABLE_PATH: executablePath,
          SITEOS_BASE_URL: baseUrl,
          SITEOS_SCREENSHOT_DIR: screenshots,
        },
        timeoutMs: 300_000,
      },
    )
    await writeFile(path.join(artifacts, 'playwright-stderr.log'), testRun.stderr)
    await writeFile(path.join(artifacts, 'playwright-report.json'), testRun.stdout)
    const report = JSON.parse(testRun.stdout)
    const specs = []
    const collect = (suite) => {
      for (const spec of suite.specs || []) specs.push(spec)
      for (const child of suite.suites || []) collect(child)
    }
    for (const suite of report.suites || []) collect(suite)
    for (const spec of specs) {
      const match = spec.title.match(/^\[([^|\]]+)\|(\d+)\](\[GATE\])?/)
      if (!match) continue
      const [, id, pointsText, gateMarker] = match
      const passed = spec.tests?.every((test) => test.results?.some((result) => result.status === 'passed'))
      const item = { id, title: spec.title, points: Number(pointsText), gate: Boolean(gateMarker) }
      if (passed) {
        summary.passedChecks.push(item)
        summary.automatedScore += item.points
      } else summary.failedChecks.push(item)
    }
    summary.journeyPassed = testRun.code === 0
    summary.hardGatePassed = summary.buildPassed && !summary.failedChecks.some((check) => check.gate)
  } catch (error) {
    summary.failedChecks.push({ id: 'EVALUATOR', title: error.message, points: 0, gate: true })
  } finally {
    preview.kill('SIGTERM')
    await writeFile(path.join(artifacts, 'preview.log'), previewLog)
  }
}

if (!summary.hardGatePassed) summary.capped = true
await writeJson(path.join(artifacts, 'evaluation-summary.json'), summary)
console.log(JSON.stringify(summary, null, 2))
if (!summary.hardGatePassed) process.exitCode = 1
