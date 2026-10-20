import { MODEL_ROWS } from './fixtures/declared-gateway.mjs'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import { nativeFrame } from './fixtures/gemini.mjs'
import { createPluginHost, PLUGIN_TEST_KEY, textOf } from './plugin-host-fixture.mjs'

// The same behavior checks can target the unpacked distribution's real entry.
const { apply } = await import(process.env.APOPHIS_TEST_ENTRY
  ? pathToFileURL(process.env.APOPHIS_TEST_ENTRY).href : '../lib/index.js')

async function server(t, handler) {
  const instance = createServer((request, response) => {
    if (request.url === '/v1/models') { response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ data: MODEL_ROWS })); return }
    handler(request, response)
  })
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => { instance.closeAllConnections(); instance.close(resolve) }))
  return `http://127.0.0.1:${instance.address().port}`
}

for (const model of ['gemini-4-argon', 'gemini-3.8-flash']) {
  test(`the built ${model} adapter refuses 307 before another origin receives any request or key`, async t => {
    const targetCalls = [], configuredCalls = []
    const target = await server(t, (request, response) => {
      targetCalls.push({ headers: request.headers, url: request.url })
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.end(nativeFrame([{ text: 'must never receive the key' }], model, 'STOP'))
    })
    const configured = await server(t, (request, response) => {
      configuredCalls.push({ headers: request.headers, url: request.url })
      response.writeHead(307, { location: `${target}/redirected` })
      response.end()
    })
    const host = await createPluginHost(t, { applyPlugin: apply, realFetch: true, config: { apiHost: configured } })
    const { assembled } = await host.turn({ model })
    assert.equal(assembled.finish?.kind, 'error')
    assert.equal(configuredCalls.length, 1)
    assert.equal(configuredCalls[0].headers['x-goog-api-key'], PLUGIN_TEST_KEY)
    assert.equal(targetCalls.length, 0, 'Fetch must reject the redirect before forwarding any headers')
    assert.equal(host.executions.length, 0)
    assert.equal(JSON.stringify(assembled.finish).includes(PLUGIN_TEST_KEY), false)
  })

  test(`the built ${model} adapter preserves split SSE reasons and status, redacts keys, and recovers next turn`, async t => {
    let calls = 0
    const configured = await server(t, (_request, response) => {
      calls += 1
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      if (calls > 1) { response.end(nativeFrame([{ text: '恢复完成。' }], model, 'STOP')); return }
      const bytes = Buffer.from(`${nativeFrame([{ text: '部分中文🔎。' }], model)}data: ${JSON.stringify({ error: {
        code: 403, status: 'PERMISSION_DENIED', message: `网关分组未开放 ${PLUGIN_TEST_KEY}`,
      } })}\r\n\r\n`)
      for (let offset = 0; offset < bytes.length; offset += 7) response.write(bytes.subarray(offset, offset + 7))
      response.end()
    })
    const host = await createPluginHost(t, { applyPlugin: apply, realFetch: true, config: { apiHost: configured } })
    const first = await host.turn({ model })
    assert.equal(textOf(first.assembled), '部分中文🔎。')
    assert.equal(first.assembled.finish?.kind, 'error')
    assert.match(first.assembled.finish.failure.message, /403.*PERMISSION_DENIED.*网关分组未开放/u)
    assert.equal(JSON.stringify(first.chunks).includes(PLUGIN_TEST_KEY), false)
    assert.equal(calls, 1, 'a partial-stream failure is never silently replayed')
    assert.equal(host.executions.length, 0)
    assert.equal((await host.rpc('status')).value.keys[0].disabled, false, 'protocol refusal does not disable a valid key')
    const next = await host.turn({ model })
    assert.equal(next.assembled.finish?.kind, 'stop')
    assert.equal(textOf(next.assembled), '恢复完成。')
    assert.equal(calls, 2)
  })

  test(`the built ${model} adapter preserves SSE errors without inventing an HTTP status`, async t => {
    const configured = await server(t, (_request, response) => {
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.end(`data: ${JSON.stringify({ error: { message: '网关未给出状态码' } })}\n\n`)
    })
    const host = await createPluginHost(t, { applyPlugin: apply, realFetch: true, config: { apiHost: configured } })
    const { assembled } = await host.turn({ model })
    assert.equal(assembled.finish?.kind, 'error')
    assert.match(assembled.finish.failure.message, /Google stream error:.*网关未给出状态码/u)
    assert.doesNotMatch(assembled.finish.failure.message, /401|403|500/u)
    assert.equal(host.executions.length, 0)
    assert.equal((await host.rpc('status')).value.keys[0].disabled, false)
  })
}
