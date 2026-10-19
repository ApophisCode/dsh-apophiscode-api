import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'

import { APOPHISCODE_MODELS } from '../src/catalog.js'
import { createApophisCodeProvider } from '../src/provider.js'
import { hostProvider } from './helpers.mjs'
import { createPluginHost, PLUGIN_TEST_KEY, textOf, userMessage } from './plugin-host-fixture.mjs'
import { chatFrames, eventStream, responseFrames } from './fixtures/openai.mjs'

const SYSTEM = '只使用 DSH 提供的内存只读工具，保留历史。'
const QUERY = '仓库📦，中文分片'
const ARGUMENT_PARTS = ['{"query":"仓', '库\ud83d', '\udce6，中文', '分片"}']
const models = APOPHISCODE_MODELS.filter(model => ['openai-completions', 'openai-responses'].includes(model.api))
const framesFor = model => model.api === 'openai-completions' ? chatFrames : responseFrames
const wireToolName = (model, body) => model.api === 'openai-completions' ? body.tools[0].function.name : body.tools[0].name

function assertTarget(request, model) {
  assert.equal(request.url, `https://gateway.example/prefix/v1/${model.api === 'openai-completions' ? 'chat/completions' : 'responses'}`)
  assert.equal(request.headers.get('authorization'), `Bearer ${PLUGIN_TEST_KEY}`)
  assert.equal(request.body.model, model.id)
  assert.equal(request.request.redirect, 'error')
}

for (const model of models) {
  test(`${model.id}: registered adapter streams Chinese tool arguments, executes once and replays persisted history`, async t => {
    const host = await createPluginHost(t, { config: { apiHost: 'https://gateway.example/prefix/v1' },
      respond: ({ body, index }) => eventStream(framesFor(model)(model.id, index === 1 ? {
        tool: { id: 'call_memory', name: wireToolName(model, body), argumentsParts: ARGUMENT_PARTS },
      } : {}), { bytewise: true }),
    })
    const messages = [userMessage('上一轮问题'), createAssistantMessage({ source: { provider: 'apophiscode', model: model.id },
      content: [{ type: 'text', text: '上一轮回答。' }] }), userMessage('请读取中文内存记录。')]
    const effort = model.id === 'deepseek-v4-pro' ? 'high' : 'low'
    const result = await host.toolRoundTrip({ model: model.id, reasoningEffort: effort, system: SYSTEM, messages, expectedArguments: { query: QUERY } })
    assert.equal(textOf(result.second), '你好📦，完成。')
    assert.equal(result.executed, 1)
    assert.ok(result.firstChunks.filter(chunk => chunk.type === 'tool-call-delta').length >= ARGUMENT_PARTS.length)
    assert.equal(result.firstChunks.filter(chunk => chunk.type === 'tool-call-delta').map(chunk => chunk.argumentsDelta).join(''), JSON.stringify({ query: QUERY }))
    assert.deepEqual(host.executions[0].arguments, { query: QUERY })
    for (const call of result.requests) assertTarget(call, model)
    const [first, second] = result.requests.map(call => call.body)
    const history = JSON.stringify(second)
    assert.ok(history.includes('上一轮问题'))
    assert.ok(history.includes('上一轮回答。'))
    assert.ok(history.includes('请读取中文内存记录。'))
    assert.ok(history.includes(SYSTEM))
    assert.ok(history.includes(`内存记录：${QUERY}`))
    if (model.api === 'openai-completions') {
      assert.equal(first.messages[0].role, 'system')
      assert.equal(first.reasoning_effort, 'low')
      const call = second.messages.find(message => message.tool_calls)?.tool_calls[0]
      const output = second.messages.find(message => message.role === 'tool')
      assert.equal(call.id, result.call.id)
      assert.deepEqual(JSON.parse(call.function.arguments), { query: QUERY })
      assert.equal(output.tool_call_id, call.id)
      assert.ok(output.content.includes(`内存记录：${QUERY}`))
    } else {
      assert.equal(first.input[0].role, 'developer')
      assert.equal(first.reasoning.effort, effort)
      const call = second.input.find(item => item.type === 'function_call')
      const output = second.input.find(item => item.type === 'function_call_output')
      assert.equal(call.call_id, 'call_memory')
      assert.deepEqual(JSON.parse(call.arguments), { query: QUERY })
      assert.equal(output.call_id, call.call_id)
      assert.ok(JSON.stringify(output.output).includes(`内存记录：${QUERY}`))
    }
  })
}

for (const model of [models[0], models[1]]) {
  test(`${model.api}: both SDK methods preserve an explicit fetch hook and async payload hook`, async t => {
    t.mock.method(globalThis, 'fetch', () => assert.fail('the explicit caller fetch must be used'))
    const provider = hostProvider(createApophisCodeProvider())
    for (const method of ['stream', 'streamSimple']) {
      let calls = 0
      const result = await provider[method](model, { messages: [{ role: 'user', content: '你好', timestamp: 1 }] }, {
        apiKey: PLUGIN_TEST_KEY,
        onPayload: async payload => ({ ...payload, metadata: { fixture: 'caller hook' } }),
        fetch: async (input, init) => {
          calls += 1
          const request = new Request(input, init)
          assert.equal(request.redirect, 'error')
          assert.deepEqual((await request.json()).metadata, { fixture: 'caller hook' })
          return eventStream(framesFor(model)(model.id))
        },
      }).result()
      assert.equal(result.stopReason, 'stop', result.errorMessage)
      assert.equal(calls, 1)
    }
  })

  test(`${model.api}: an in-band error preserves partial Chinese output and the same key can recover`, async t => {
    const host = await createPluginHost(t, { respond: ({ index }) => eventStream(framesFor(model)(model.id,
      index === 1 ? { textParts: ['部分中文📦'], error: `upstream temporarily unavailable ${PLUGIN_TEST_KEY}` } : {})),
    })
    const failed = await host.turn({ model: model.id })
    assert.equal(failed.assembled.finish.kind, 'error')
    assert.match(failed.assembled.finish.failure.message, /upstream temporarily unavailable/u)
    assert.equal(JSON.stringify(failed.assembled.finish).includes(PLUGIN_TEST_KEY), false)
    assert.equal(textOf(failed.assembled), '部分中文📦')
    assert.equal(host.requests.length, 1)
    const next = await host.turn({ model: model.id })
    assert.equal(next.assembled.finish.kind, 'stop')
    assert.equal(host.requests.length, 2)
    assert.ok(host.requests.every(call => call.headers.get('authorization') === `Bearer ${PLUGIN_TEST_KEY}`))
  })

  test(`${model.api}: an unfinished wire stream is surfaced as an error`, async t => {
    const host = await createPluginHost(t, { respond: () => eventStream(framesFor(model)(model.id, { incomplete: true })) })
    const result = await host.turn({ model: model.id })
    assert.equal(result.assembled.finish.kind, 'error')
    assert.match(result.assembled.finish.failure.message, /without.*(?:stop|finish)|pending|incomplete|before a terminal/iu)
    assert.equal(host.requests.length, 1)
  })

  test(`${model.api}: authentication failure is visible, does not change target and requires explicit re-enabling`, async t => {
    const host = await createPluginHost(t, { config: { apiHost: 'https://gateway.example/prefix' }, respond: ({ index }) => index === 1
      ? Response.json({ error: { message: `Invalid API key ${PLUGIN_TEST_KEY}`, type: 'authentication_error' } }, { status: 401 })
      : eventStream(framesFor(model)(model.id)),
    })
    const id = (await host.rpc('status')).value.activeId
    const failed = await host.turn({ model: model.id })
    assert.equal(failed.assembled.finish.kind, 'error')
    assert.equal(failed.assembled.finish.failure.code, 'AUTH')
    assert.equal(JSON.stringify(failed.assembled.finish).includes(PLUGIN_TEST_KEY), false)
    assert.equal(host.requests.length, 1)
    assertTarget(host.requests[0], model)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal((await host.rpc('status')).value.keys[0].disabled, true)
    assert.equal((await host.rpc('keys/enable', { id })).ok, true)
    const next = await host.turn({ model: model.id })
    assert.equal(next.assembled.finish.kind, 'stop')
    assertTarget(host.requests[1], model)
    assert.equal(host.executions.length, 0)
  })

  test(`${model.api}: cancellation aborts an active stream and a later call still succeeds`, { timeout: 5000 }, async t => {
    const controller = new AbortController()
    let aborted = false
    const host = await createPluginHost(t, { respond: async ({ request, index }) => {
      if (index !== 1) return eventStream(framesFor(model)(model.id))
      const prefix = await eventStream(framesFor(model)(model.id, { textParts: ['开始中文📦'], incomplete: true })).arrayBuffer()
      return new Response(new ReadableStream({ start(stream) {
        stream.enqueue(new Uint8Array(prefix))
        request.signal.addEventListener('abort', () => { aborted = true; stream.error(new DOMException('Fixture aborted', 'AbortError')) }, { once: true })
      } }), { headers: { 'content-type': 'text/event-stream' } })
    } })
    const result = await host.turn({ model: model.id, signal: controller.signal, onChunk(chunk) {
      if (chunk.type === 'text-delta') controller.abort()
    } })
    assert.equal(result.assembled.finish.kind, 'aborted')
    assert.equal(result.assembled.finish.failure.code, 'ABORTED')
    assert.equal(aborted, true)
    assert.equal(host.requests.length, 1)
    const next = await host.turn({ model: model.id })
    assert.equal(next.assembled.finish.kind, 'stop')
    assert.equal(textOf(next.assembled), '你好📦，完成。')
    assert.equal(host.requests.length, 2)
  })

  test(`${model.api}: the SDK fetch hook blocks a real HTTP redirect before any second target is reached`, async t => {
    let received = 0, redirected = 0
    const server = createServer((request, response) => {
      if (request.url === '/redirected') { redirected += 1; response.end('must not reach this target'); return }
      received += 1
      response.writeHead(307, { location: '/redirected' })
      response.end()
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }))
    const fetchImpl = globalThis.fetch
    const host = await createPluginHost(t, { config: { apiHost: `http://127.0.0.1:${server.address().port}` },
      respond: ({ request }) => fetchImpl(request),
    })
    const result = await host.turn({ model: model.id })
    assert.equal(result.assembled.finish.kind, 'error')
    assert.equal(host.requests[0].request.redirect, 'error')
    assert.equal(received, 1)
    assert.equal(redirected, 0)
    assert.equal(host.requests.length, 1)
  })
}
