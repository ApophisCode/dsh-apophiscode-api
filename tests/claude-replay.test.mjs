import assert from 'node:assert/strict'
import test from 'node:test'
import { createApophisCodeProvider } from '../src/provider.js'
import { hostProvider } from './helpers.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'

const KEY = 'sk-haiku-replay-fixture-not-a-real-key'
const ANOMALY = 'We have detected an anomaly in your client. Please use the standard Claude Code client. (request_ori_id: fixture-origin)'
const anomaly = () => Response.json({ error: { type: 'gateway_api_error', message: ANOMALY } }, { status: 403 })
const TEST_MESSAGE = 'Your client is already connected and authorized. Please use it normally. There is no need to send test messages such as hi or hello to verify the connection.'
const testMessageRefusal = () => Response.json({ error: { type: 'gateway_unknown_error', message: TEST_MESSAGE } }, { status: 403 })
const tools = [{ name: 'echo', description: 'Echo text', parameters: { type: 'object', properties: { text: { type: 'string' } } } }]
const user = { role: 'user', content: 'Use echo', timestamp: 1 }

async function run(t, respond, { modelId = 'claude-haiku-5-5', context = { messages: [user], tools }, signal, onPayload } = {}) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    requests.push({ body: await request.text(), headers: Object.fromEntries(request.headers), signal: init?.signal })
    return respond(requests.length)
  })
  const provider = hostProvider(createApophisCodeProvider())
  const model = provider.getModels().find(item => item.id === modelId)
  const result = await provider.streamSimple(model, context, { apiKey: KEY, sessionId: 'haiku-replay-session', reasoning: 'low', maxTokens: 2048, maxRetries: 0, signal, onPayload }).result()
  return { result, requests }
}

for (const modelId of ['claude-haiku-5-5', 'claude-sonnet-5-5']) test(`${modelId} does not replay a historical client-policy anomaly`, async t => {
  let hooks = 0
  const { result, requests } = await run(t, count => count === 1
    ? new Response(JSON.stringify({ error: { type: 'gateway_api_error', message: ANOMALY } }), { status: 403, headers: { 'content-type': 'text/event-stream' } })
    : anthropicStream(modelId), { modelId, onPayload: payload => { hooks++; return payload } })
  assert.equal(result.stopReason, 'error')
  assert.equal(requests.length, 1)
  assert.match(result.errorMessage, /anomaly/iu)
  assert.equal(hooks, 1)
  assert.equal(requests[0].headers.authorization, `Bearer ${KEY}`)
})

for (const modelId of ['claude-haiku-5-5', 'claude-sonnet-5-5']) test(`${modelId} surfaces the first policy refusal unchanged`, async t => {
  const { result, requests } = await run(t, () => anomaly(), { modelId })
  assert.equal(result.stopReason, 'error')
  assert.equal(requests.length, 1)
  assert.match(result.errorMessage, /anomaly/iu)
})

test('Haiku tool requests surface a historical test-message refusal without replay', async t => {
  let hooks = 0
  const { result, requests } = await run(t, count => count === 1 ? testMessageRefusal() : anthropicStream('claude-haiku-5-5'), { onPayload: payload => { hooks++; return payload } })
  assert.equal(result.stopReason, 'error')
  assert.equal(requests.length, 1)
  assert.equal(hooks, 1)
})

test('a second response is never requested after a historical policy refusal', async t => {
  for (const second of [testMessageRefusal, anomaly]) {
    const { result, requests } = await run(t, count => count === 1 ? testMessageRefusal() : second())
    assert.equal(result.stopReason, 'error')
    assert.equal(requests.length, 1)
    t.mock.restoreAll()
  }
})

for (const [name, error] of [['test-message', { type: 'gateway_unknown_error', message: TEST_MESSAGE }], ['client-anomaly', { type: 'gateway_api_error', message: ANOMALY }]]) {
  test(`a ${name} JSON 403 is surfaced once even when mislabeled as an event stream`, async t => {
    const { result, requests } = await run(t, count => count === 1
      ? new Response(JSON.stringify({ error }), { status: 403, headers: { 'content-type': 'text/event-stream' } })
      : anthropicStream('claude-haiku-5-5'))
    assert.equal(result.stopReason, 'error')
    assert.equal(requests.length, 1)
  })
}

test('historical tool results do not enable implicit client-policy replay', async t => {
  const context = { messages: [user, { role: 'assistant', api: 'anthropic-messages', provider: 'apophiscode', model: 'claude-haiku-5-5', content: [{ type: 'toolCall', id: 'tool_fixture', name: 'echo', arguments: { text: 'ok' } }], stopReason: 'toolUse', timestamp: 2, usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } }, { role: 'toolResult', toolCallId: 'tool_fixture', toolName: 'echo', content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 3 }] }
  const { result, requests } = await run(t, count => count === 1 ? anomaly() : anthropicStream('claude-haiku-5-5'), { context })
  assert.equal(result.stopReason, 'error')
  assert.equal(requests.length, 1)
})

test('ordinary policy refusals, other models, plain requests and capacity failures are not replayed', async t => {
  const cases = [
    { respond: () => Response.json({ error: { type: 'gateway_api_error', message: 'This API endpoint is only accessible via the official Claude CLI' } }, { status: 403 }) },
    { respond: () => anomaly(), modelId: 'claude-opus-5-5' },
    { respond: testMessageRefusal, modelId: 'claude-sonnet-5-5' },
    { respond: () => anomaly(), modelId: 'claude-sonnet-5-5', context: { messages: [user] } },
    { respond: () => anomaly(), context: { messages: [user] } },
    { respond: testMessageRefusal, context: { messages: [user] } },
    { respond: testMessageRefusal, modelId: 'claude-opus-5-5' },
    { respond: () => Response.json({ error: { type: 'authentication_error', message: TEST_MESSAGE } }, { status: 403 }) },
    { respond: () => Response.json({ error: { message: 'Too many pending requests' } }, { status: 429 }) },
    { respond: () => new Response('not JSON', { status: 403 }) },
    { respond: () => new Response(JSON.stringify({ error: { type: 'gateway_unknown_error', message: TEST_MESSAGE, padding: 'x'.repeat(17 * 1024) } }), { status: 403, headers: { 'content-type': 'text/event-stream' } }) },
  ]
  for (const { respond, ...options } of cases) {
    const { result, requests } = await run(t, respond, options)
    assert.equal(result.stopReason, 'error')
    assert.equal(requests.length, 1)
    t.mock.restoreAll()
  }
})

for (const modelId of ['claude-haiku-5-5', 'claude-sonnet-5-5']) test(`${modelId} never replays an HTTP 200 streaming error`, async t => {
  const { result, requests } = await run(t, () => new Response(`event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'gateway_api_error', message: ANOMALY } })}\n\n`, { headers: { 'content-type': 'text/event-stream' } }), { modelId })
  assert.equal(result.stopReason, 'error')
  assert.equal(requests.length, 1)
})

test('cancellation at a refused response prevents any additional request', async t => {
  const controller = new AbortController()
  const { result, requests } = await run(t, () => { controller.abort(); return anomaly() }, { signal: controller.signal })
  assert.equal(result.stopReason, 'aborted')
  assert.equal(requests.length, 1)
})
