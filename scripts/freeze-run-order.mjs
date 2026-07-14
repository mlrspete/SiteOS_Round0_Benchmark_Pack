import { randomInt, randomUUID } from 'node:crypto'
import path from 'node:path'
import { stat } from 'node:fs/promises'
import {
  adapterIsVerified,
  modelManifest,
  readAdapterStatus,
  root,
  writeJson,
} from './lib.mjs'

const manifest = await modelManifest()
const blocked = []
for (const model of manifest.models) {
  const status = await readAdapterStatus(model.slug)
  if (!adapterIsVerified(model, status)) blocked.push(model.slug)
}
if (blocked.length) throw new Error(`Cannot freeze run order; three-probe adapters are not verified: ${blocked.join(', ')}`)

const output = path.join(root, 'benchmark', 'run-order.json')
if (await stat(output).catch(() => null)) throw new Error('benchmark/run-order.json already exists; refusing to reshuffle a frozen order.')
const order = [...manifest.models]
for (let index = order.length - 1; index > 0; index -= 1) {
  const swap = randomInt(index + 1)
  ;[order[index], order[swap]] = [order[swap], order[index]]
}
const usedCodes = new Set()
const candidateCode = () => {
  let code
  do code = `C-${randomInt(10_000).toString().padStart(4, '0')}`
  while (usedCodes.has(code))
  usedCodes.add(code)
  return code
}
await writeJson(output, {
  frozenAt: new Date().toISOString(),
  drawId: randomUUID(),
  method: 'Node.js cryptographic randomInt Fisher-Yates; output is the frozen audit record',
  order: order.map((model, index) => ({ position: index + 1, slug: model.slug, candidateCode: candidateCode() })),
})
console.log(output)
