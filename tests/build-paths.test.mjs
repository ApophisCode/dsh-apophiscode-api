import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'

import configurations from '../tsdown.config.mjs'

const { rolldown } = await import(pathToFileURL(createRequire(import.meta.resolve('tsdown')).resolve('rolldown')).href)
const suffixes = [
  '@earendil-works+pi-ai@1.1.0_512fb1bd2ed45f93db4357e841872ab3',
  '@earendil-works+pi-ai@1.1.0_@aws-sdk+credential-provider-node@3.972.85_@smithy+signature-v4@5.7.4_ws@8.22.0_zod@4.6.6',
]
const literal = '//#region node_modules/.pnpm/this is runtime text  \n尾部空格  '
const source = [
  '/*! @license ApophisCode build fixture */',
  `export const preserved = ${JSON.stringify(literal)}`,
  'export function run(value) { return `line with spaces  ',
  '${value}` }',
  '',
].join('\n')

async function build(inputOptions, format, suffix) {
  const id = resolve('.artifacts/build-fixture/node_modules/.pnpm', suffix, 'node_modules/path-fixture/index.js')
  const bundle = await rolldown({
    ...inputOptions,
    input: 'path-fixture',
    plugins: [{ name: 'in-memory-path-fixture', resolveId: () => id, load: () => source }],
  })
  try { return (await bundle.generate({ format })).output[0].code }
  finally { await bundle.close() }
}

for (const configuration of configurations) {
  test(`${configuration.name} output is independent of pnpm peer paths and preserves license and runtime text`, async () => {
    const format = configuration.platform === 'node' ? 'es' : 'cjs'
    const windows = await build(configuration.inputOptions, format, suffixes[0])
    const linux = await build(configuration.inputOptions, format, suffixes[1])
    assert.equal(windows, linux)
    assert.match(windows, /@license ApophisCode build fixture/u)
    let result
    if (format === 'es') result = await import(`data:text/javascript;base64,${Buffer.from(windows).toString('base64')}`)
    else {
      const module = { exports: {} }
      vm.runInNewContext(windows, { module, exports: module.exports })
      result = module.exports
    }
    assert.equal(result.preserved, literal)
    assert.equal(result.run('中文'), 'line with spaces  \n中文')
  })
}
