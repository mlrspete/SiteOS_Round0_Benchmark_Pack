import { randomInt, randomUUID } from 'node:crypto'
import path from 'node:path'
import { modelManifest, root, writeJson } from './lib.mjs'
import { stat } from 'node:fs/promises'

const manifest = await modelManifest()
const blocked = manifest.models.filter((model) => model.adapterStatus !== 'verified' || !model.harnessModel)
if (blocked.length) {
  throw new Error(`Cannot freeze run order; adapters are not verified: ${blocked.map((model) => model.slug).join(', ')}`)
}
const output = path.join(root, 'benchmark', 'run-order.json')
if (await stat(output).catch(() => null)) throw new Error('benchmark/run-order.json already exists; refusing to reshuffle a frozen order.')
const order = [...manifest.models]
for (let index = order.length - 1; index > 0; index -= 1) {
  const swap = randomInt(index + 1)
  ;[order[index], order[swap]] = [order[swap], order[index]]
}
await writeJson(output, {
  frozenAt: new Date().toISOString(),
  drawId: randomUUID(),
  method: 'Node.js cryptographic randomInt Fisher-Yates; output is the frozen audit record',
  order: order.map((model, index) => ({ position: index + 1, slug: model.slug })),
})
console.log(output)
