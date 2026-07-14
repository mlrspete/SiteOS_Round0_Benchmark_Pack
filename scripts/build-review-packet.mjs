import path from 'node:path'
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import {
  benchmarkDir,
  modelManifest,
  parseArgs,
  readJson,
  root,
  runProcess,
} from './lib.mjs'

const args = parseArgs()
if (!args.model && !args.all) throw new Error('Usage: npm run review:packet -- --model <slug> OR --all')
const order = await readJson(path.join(benchmarkDir, 'run-order.json')).catch(() => null)
if (!order) throw new Error('Missing frozen benchmark/run-order.json.')
const manifest = await modelManifest()
const models = args.all ? manifest.models : [manifest.models.find((model) => model.slug === args.model)]
if (models.some((model) => !model)) throw new Error(`Unknown model: ${args.model}`)

async function walk(directory, base = directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    if (['node_modules', 'dist', '.git', '.opencode-state'].includes(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await walk(absolute, base))
    else output.push(path.relative(base, absolute))
  }
  return output
}

for (const model of models) {
  const orderEntry = order.order.find((entry) => entry.slug === model.slug)
  const runArtifacts = path.join(root, 'runs', model.slug, 'artifacts')
  const worktree = path.join(root, 'runs', model.slug, 'worktree')
  const evaluation = await readJson(path.join(runArtifacts, 'evaluation-summary.json')).catch(() => null)
  if (!evaluation) throw new Error(`${model.slug} has not been evaluated.`)
  const packet = path.join(root, 'review-packets', orderEntry.candidateCode)
  const packetScreenshots = path.join(packet, 'screenshots')
  await mkdir(packetScreenshots, { recursive: true })
  for (const width of ['360', '768', '1440']) {
    const source = path.join(runArtifacts, 'screenshots', `${width}.png`)
    if (await stat(source).catch(() => null)) await copyFile(source, path.join(packetScreenshots, `${width}.png`))
  }
  const video = path.join(runArtifacts, 'review-motion.webm')
  if (await stat(video).catch(() => null)) await copyFile(video, path.join(packet, 'interaction.webm'))
  await copyFile(path.join(benchmarkDir, 'scorecard.md'), path.join(packet, 'scorecard.md'))

  const files = new Set([...await walk(path.join(root, 'app-starter')), ...await walk(worktree)])
  const diffParts = []
  for (const relative of [...files].sort()) {
    if (!/\.(css|html|js|jsx|json|md|mjs|svg|ts|tsx)$/i.test(relative)) continue
    if (relative === 'package-lock.json') continue
    const baseline = path.join(root, 'app-starter', relative)
    const candidate = path.join(worktree, relative)
    const baselineExists = await stat(baseline).catch(() => null)
    const candidateExists = await stat(candidate).catch(() => null)
    const diff = await runProcess('diff', [
      '-u', '--label', `baseline/${relative}`, '--label', `candidate/${relative}`,
      baselineExists ? baseline : '/dev/null', candidateExists ? candidate : '/dev/null',
    ])
    if (diff.stdout) diffParts.push(diff.stdout)
  }
  await writeFile(path.join(packet, 'diff.patch'), diffParts.join('\n'))
  await writeFile(path.join(packet, 'README.md'), [
    `# Blind review packet ${orderEntry.candidateCode}`,
    '',
    'Review only this directory. Do not inspect the benchmark run folders, run order, transcripts, costs or model identities.',
    '',
    '- Inspect all three screenshots at their natural width.',
    '- Watch `interaction.webm` when present.',
    '- Review `diff.patch` for code quality.',
    '- Apply `scorecard.md` independently before discussing the candidate with another reviewer.',
    '- Record the result with the candidate code and your reviewer code.',
    '',
    `Automated gate disclosed to reviewers: ${evaluation.hardGatePassed ? 'PASS' : 'FAIL'}. Do not change manual craft scores to compensate for it.`,
    '',
  ].join('\n'))
  console.log(packet)
}
