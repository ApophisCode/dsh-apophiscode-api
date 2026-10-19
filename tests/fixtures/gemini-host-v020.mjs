/** Run the same registered-plugin fixture with real 0.2.0 host dependencies. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

const oldHostEntry = import.meta.resolve('apophiscode-host-v020-fixture')
const pluginEntry = process.env.APOPHIS_TEST_ENTRY
  ? pathToFileURL(process.env.APOPHIS_TEST_ENTRY).href : new URL('../../lib/index.js', import.meta.url).href
const libraryRoot = new URL('./', pluginEntry).href
const fixtureUrl = new URL('../plugin-host-fixture.mjs', import.meta.url).href
const resolvedHost = new Map()
// Emulate how the installed tarball resolves its declared host dependencies.
// Only the test process is affected; no DSH profile or dependency is changed.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if ((context.parentURL?.startsWith(libraryRoot) || context.parentURL === fixtureUrl)
    && (specifier.startsWith('@deepseek-ai/') || specifier.startsWith('@earendil-works/pi-ai'))) {
    const resolved = nextResolve(specifier, { ...context, parentURL: oldHostEntry })
    resolvedHost.set(specifier, resolved.url)
    return resolved
  }
  return nextResolve(specifier, context)
} })
const { apply } = await import(pluginEntry)
const { createPluginHost } = await import('../plugin-host-fixture.mjs')
const { nativeFrames, TOOL_SIGNATURE } = await import('./gemini.mjs')

for (const model of ['gemini-4-argon', 'gemini-3.8-flash']) {
  test(`DSH 0.2.0-rc.2 adapter and ToolRuntime complete the bundled ${model} native tool loop`, async t => {
    for (const [name, version] of [['@earendil-works/pi-ai', '0.87.1'],
      ['@deepseek-ai/dsh-llm-pi-ai', '0.2.0-rc.2'], ['@deepseek-ai/dsh-tools', '0.2.0-rc.2']]) {
      assert.equal(JSON.parse(readFileSync(new URL('../package.json', resolvedHost.get(name)), 'utf8')).version, version)
    }
    const host = await createPluginHost(t, { applyPlugin: apply, respond: ({ body, index }) => index === 1
      ? nativeFrames([[{ functionCall: { id: 'call_v020_memory', name: body.tools[0].functionDeclarations[0].name,
        args: { query: '旧宿主中文🔎' } }, thoughtSignature: TOOL_SIGNATURE }]], model)
      : nativeFrames([[{ text: '旧宿主工具完成。' }]], model) })
    const result = await host.toolRoundTrip({ model, expectedArguments: { query: '旧宿主中文🔎' } })
    assert.equal(result.executed, 1)
    assert.equal(result.second.finish?.kind, 'stop')
    assert.ok(JSON.stringify(result.second.blocks()).includes('旧宿主工具完成'))
    assert.equal(host.requests.length, 2)
  })
}
test.after(() => hooks.deregister())
