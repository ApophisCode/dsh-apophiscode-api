import assert from 'node:assert/strict'
import test from 'node:test'

import { anthropicStream } from './fixtures/anthropic.mjs'
import { createPluginHost, PLUGIN_TEST_KEY, textOf } from './plugin-host-fixture.mjs'

const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']
const frame = event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
const framesOf = async response => (await response.text()).trim().split('\n\n')
  .map(part => JSON.parse(part.split('\n').find(line => line.startsWith('data: ')).slice(6)))

/** Real SDK input, with every UTF-8 byte and CRLF delimiter split on the network. */
function byteStream(events, { close = true, onCancel = () => {} } = {}) {
  const bytes = new TextEncoder().encode(events.map(frame).join('').replaceAll('\n', '\r\n'))
  let offset = 0
  return new Response(new ReadableStream({
    pull(controller) {
      if (offset < bytes.length) controller.enqueue(bytes.slice(offset, ++offset))
      else if (close) controller.close()
    },
    cancel: onCancel,
  }), { headers: { 'content-type': 'text/event-stream' } })
}

for (const model of MODELS) test(`${model}: registered Messages route executes one native tool and replays signed history`, async t => {
  const host = await createPluginHost(t, { respond: async ({ body, index }) => {
    if (index === 1) {
      const events = await framesOf(anthropicStream(model, {
        type: 'tool_use', id: 'call_signed_inventory', name: body.tools[0].name, input: { query: '库存📦' },
      }))
      for (const event of events) if (typeof event.index === 'number') event.index++
      events.splice(1, 0,
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'opaque-apophis-fixture-signature' } },
        { type: 'content_block_stop', index: 0 },
      )
      return byteStream(events)
    }
    const events = await framesOf(anthropicStream(model, { type: 'text', text: '已读取库存。' }))
    const delta = events.findIndex(event => event.delta?.type === 'text_delta')
    events.splice(delta, 1,
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '已读取' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '库存📦。' } },
    )
    return byteStream(events)
  } })
  const result = await host.toolRoundTrip({ model, expectedArguments: { query: '库存📦' } })
  for (const { headers, url, request, body } of result.requests) {
    const target = new URL(url)
    assert.equal(target.origin + target.pathname, 'https://www.apophis.uk/v1/messages')
    assert.equal(target.searchParams.get('beta'), 'true', 'the SDK retains its own feature negotiation')
    assert.equal(request.redirect, 'error')
    assert.equal(headers.get('authorization'), `Bearer ${PLUGIN_TEST_KEY}`)
    assert.equal(headers.get('x-api-key'), null)
    assert.equal(headers.get('anthropic-version'), '2023-06-01')
    assert.equal(headers.get('x-app'), null)
    assert.equal(headers.get('x-claude-code-session-id'), null)
    assert.equal(body.metadata?.user_id, undefined)
    assert.equal(body.model, model)
    assert.equal(body.output_config?.effort, undefined)
  }
  assert.equal(result.call.id, 'call_signed_inventory')
  assert.equal(result.executed, 1)
  assert.equal(textOf(result.second), '已读取库存📦。')
  assert.deepEqual(result.secondChunks.filter(chunk => chunk.type === 'text-delta').map(chunk => chunk.text), ['已读取', '库存📦。'])
  assert.equal(result.first.replayState.blocks[0].thinkingSignature, 'opaque-apophis-fixture-signature')
  const history = result.requests[1].body.messages.flatMap(message => message.content)
  assert.deepEqual(history.find(block => block.type === 'thinking'), { type: 'thinking', thinking: '', signature: 'opaque-apophis-fixture-signature' })
  assert.equal(history.find(block => block.type === 'tool_use').id, result.call.id)
  const returned = history.find(block => block.type === 'tool_result')
  assert.equal(returned.tool_use_id, result.call.id)
  assert.ok(JSON.stringify(returned).includes('内存记录：库存📦'))
})

test('a registered DSH tool omitted from this Messages request cannot execute under its native name', async t => {
  const host = await createPluginHost(t, { respond: ({ body }) => anthropicStream(body.model,
    { type: 'tool_use', id: 'call_not_offered', name: 'lookup_memory', input: { query: 'must never run' } }),
  })
  assert.equal(host.runtime.schemas(host.agent)[0].name, 'lookup_memory', 'the tool is registered in the real runtime')
  const { assembled, chunks } = await host.turn({ model: MODELS[2], tools: [] })
  assert.equal(assembled.finish.kind, 'error')
  assert.match(assembled.finish.failure.message, /tool that was not offered/u)
  assert.equal(assembled.blocks().filter(block => block.type === 'tool-call').length, 0)
  assert.equal(chunks.filter(chunk => chunk.type === 'tool-call-delta').length, 0)
  assert.equal(host.requests[0].body.tools?.length ?? 0, 0)
  assert.deepEqual(host.requests[0].body.tool_choice, { type: 'none' })
  assert.equal(host.executions.length, 0)
  assert.equal(host.requests.length, 1)
})

test('a response cannot bypass the offered wire alias by spelling a registered DSH tool name directly', async t => {
  const host = await createPluginHost(t, { respond: ({ body }) => anthropicStream(body.model,
    { type: 'tool_use', id: 'call_wrong_alias', name: 'lookup_memory', input: { query: 'must never run' } }),
  })
  const { assembled } = await host.turn({ model: MODELS[2] })
  assert.equal(assembled.finish.kind, 'error')
  assert.match(assembled.finish.failure.message, /tool that was not offered/u)
  assert.notEqual(host.requests[0].body.tools[0].name, 'lookup_memory')
  assert.equal(host.executions.length, 0)
  assert.equal(host.requests.length, 1)
})

test('the registered Messages route completes at message_stop while the HTTP body remains open', async t => {
  let cancelled = false
  const host = await createPluginHost(t, { respond: async ({ body }) => byteStream(
    await framesOf(anthropicStream(body.model, { type: 'text', text: '完整回答。' })),
    { close: false, onCancel: () => { cancelled = true } },
  ) })
  const { assembled, chunks } = await host.turn({ model: MODELS[2], signal: AbortSignal.timeout(2_000) })
  assert.equal(assembled.finish.kind, 'stop')
  assert.equal(textOf(assembled), '完整回答。')
  assert.equal(chunks.filter(chunk => chunk.type === 'finish').length, 1)
  assert.equal(cancelled, true)
  assert.equal(host.requests.length, 1)
})

test('cancelling a registered Messages stream cancels its reader and the next turn succeeds', async t => {
  const controller = new AbortController()
  let cancelled = false
  const host = await createPluginHost(t, { respond: async ({ body, index }) => {
    const events = await framesOf(anthropicStream(body.model, { type: 'text', text: index === 1 ? '部分文本' : '下一轮正常' }))
    return byteStream(index === 1 ? events.slice(0, 3) : events, { close: index !== 1, onCancel: () => { cancelled = true } })
  } })
  const first = await host.turn({ model: MODELS[1], signal: controller.signal,
    onChunk: chunk => { if (chunk.type === 'text-delta') controller.abort() },
  })
  assert.equal(first.assembled.finish.kind, 'aborted')
  assert.equal(cancelled, true)
  assert.equal(first.chunks.filter(chunk => chunk.type === 'finish').length, 1)
  assert.equal((await host.rpc('status', {})).value.keys[0].disabled, false)
  const second = await host.turn({ model: MODELS[1] })
  assert.equal(second.assembled.finish.kind, 'stop')
  assert.equal(textOf(second.assembled), '下一轮正常')
  assert.equal(host.requests.length, 2)
})

test('a mid-stream Messages error preserves accepted text and does not rotate the key or replay', async t => {
  const host = await createPluginHost(t, { respond: async ({ body }) => {
    const events = await framesOf(anthropicStream(body.model, { type: 'text', text: '已收到的部分。' }))
    return byteStream([...events.slice(0, 3), { type: 'error', error: { type: 'overloaded_error', message: 'gateway stream interrupted' } }])
  } })
  const { assembled, chunks } = await host.turn({ model: MODELS[0] })
  assert.equal(assembled.finish.kind, 'error')
  assert.match(assembled.finish.failure.message, /gateway stream interrupted/u)
  assert.equal(chunks.filter(chunk => chunk.type === 'text-delta').map(chunk => chunk.text).join(''), '已收到的部分。')
  assert.equal(host.requests.length, 1)
  assert.equal((await host.rpc('status', {})).value.keys[0].disabled, false)
  assert.equal(host.executions.length, 0)
})

test('an explicit Messages authentication failure is redacted, disables only its key and makes one request', async t => {
  const host = await createPluginHost(t, { respond: () => Response.json({ error: {
    type: 'authentication_error', message: `invalid API key ${PLUGIN_TEST_KEY}`,
  } }, { status: 401 }) })
  const { assembled } = await host.turn({ model: MODELS[0] })
  assert.equal(assembled.finish.kind, 'error')
  assert.equal(assembled.finish.failure.code, 'AUTH')
  assert.ok(!JSON.stringify(assembled.finish).includes(PLUGIN_TEST_KEY))
  assert.equal(host.requests.length, 1)
  assert.equal((await host.rpc('status', {})).value.keys[0].disabled, true)
  assert.equal(host.executions.length, 0)
})

for (const [type, message] of [
  ['gateway_api_error', 'This API endpoint is only accessible via the official Claude CLI (request id: legacy-fixture)'],
  ['gateway_unknown_error', 'Your client is already connected and authorized. There is no need to send test messages to verify the connection.'],
]) test(`a historical ${type} policy refusal never silently retries or selects another transport`, async t => {
  const host = await createPluginHost(t, { config: { claudeTransport: 'auto' }, respond: () => Response.json({ error: { type, message } }, { status: 403 }) })
  const { assembled } = await host.turn({ model: MODELS[2] })
  assert.equal(assembled.finish.kind, 'error')
  assert.equal(host.requests.length, 1)
  assert.equal((await host.rpc('status', {})).value.keys[0].disabled, false)
  assert.equal((await host.rpc('claude-cli/status', {})).value.processes.opened, 0)
  assert.equal(host.executions.length, 0)
})
