import assert from 'node:assert/strict'
import test from 'node:test'
import { BlockAssembler, createUserMessage, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import { createApophisCodeProvider } from './fixtures/declared-gateway.mjs'
import { createRouteAdapter } from './fixtures/declared-gateway.mjs'
import { ApophisCodeKeyRing } from '../src/key-ring.js'
import { createVisionFixture } from '../scripts/vision-fixture.mjs'
import { fakeCredentials, hostProvider } from './helpers.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'

const KEY = 'sk-native-fixture-not-a-real-key'
const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']
const user = { role: 'user', content: 'Reply ok', timestamp: 1 }

function capture(t, reply = request => anthropicStream(request.body.model)) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const wire = new Request(input, init)
    const request = { url: new URL(wire.url), body: await wire.json(), headers: wire.headers, redirect: init?.redirect }
    requests.push(request)
    return reply(request)
  })
  return requests
}

test('HTTP keeps caller session metadata without inventing a Claude Code device identity', async t => {
  const requests = capture(t)
  const provider = hostProvider(createApophisCodeProvider())
  const model = provider.getModels().find(item => item.id === 'claude-haiku-5-5')
  await provider.streamSimple(model, { messages: [user] }, { apiKey: KEY, sessionId: 'dsh-session-for-cli-header', maxTokens: 2048,
    onPayload: payload => ({ ...payload, metadata: { user_id: 'caller-owned-user' } }),
  }).result()
  const request = requests[0]
  assert.equal(request.headers.get('x-claude-code-session-id'), null)
  assert.equal(request.body.metadata.user_id, 'caller-owned-user')
})

test('HTTP preserves host instructions without injecting CLI identity or billing attribution', async t => {
  const requests = capture(t)
  const provider = hostProvider(createApophisCodeProvider())
  const model = provider.getModels().find(item => item.id === 'claude-haiku-5-5')
  for (const prompt of ['读取 /private/var/folders/example/inventory.json 的库存记录。', '我们要整理库存📦，请说明处理顺序。', '订单']) {
    await provider.streamSimple(model, { systemPrompt: 'Keep the original host instructions.', messages: [{ role: 'user', content: prompt, timestamp: 1 }, { role: 'user', content: '继续处理上面的任务。', timestamp: 2 }] }, { apiKey: KEY, maxTokens: 2048 }).result()
    assert.deepEqual(requests.at(-1).body.system.map(block => block.text), ['Keep the original host instructions.'])
  }
})

for (const id of MODELS) {
  test(`${id} sends native efforts with a plugin-key-only client envelope`, async t => {
    const requests = capture(t)
    const provider = hostProvider(createApophisCodeProvider())
    const model = provider.getModels().find(item => item.id === id)
    for (const reasoning of ['low', 'medium', 'high', 'xhigh', 'max']) {
      const result = await provider.streamSimple(model, { systemPrompt: 'Original DSH system.', messages: [user] }, {
        apiKey: KEY, sessionId: 'dsh-session-not-a-uuid', reasoning, maxTokens: 2048,
        headers: { Authorization: 'Bearer sk-foreign-fixture', 'X-API-Key': 'sk-foreign-header-fixture', 'x-custom': 'kept' },
      }).result()
      assert.equal(result.stopReason, 'stop', result.errorMessage)
      const request = requests.at(-1)
      assert.equal(request.url.origin + request.url.pathname, 'https://www.apophis.uk/v1/messages')
      assert.equal(request.headers.get('authorization'), `Bearer ${KEY}`)
      assert.equal(request.headers.get('x-api-key'), null)
      assert.doesNotMatch(request.headers.get('user-agent'), /claude-cli/u)
      assert.equal(request.headers.get('x-app'), null)
      assert.equal(request.headers.get('anthropic-version'), '2023-06-01')
      assert.ok(!request.headers.get('anthropic-beta')?.split(',').includes('claude-code-20250219'))
      assert.equal(request.headers.get('x-custom'), 'kept')
      assert.equal(request.redirect, 'error')
      assert.equal(request.body.output_config.effort, reasoning)
      assert.equal(request.body.thinking, undefined)
      assert.equal(request.body.max_tokens, 2048)
      assert.deepEqual(request.body.tool_choice, { type: 'none' })
      assert.deepEqual(request.body.system.map(block => block.text), ['Original DSH system.'])
      assert.equal(request.body.metadata?.user_id, undefined)
      assert.equal(request.headers.get('x-claude-code-session-id'), null)
      assert.ok(!JSON.stringify(request.body).includes(KEY))
    }
  })
}

test('raw and simple streams preserve async payload hooks and separate sessions', async t => {
  const requests = capture(t)
  const provider = hostProvider(createApophisCodeProvider())
  const model = provider.getModels().find(item => item.id === MODELS[0])
  const source = { systemPrompt: 'Do not lose DSH instructions.', messages: [user] }
  const snapshot = JSON.stringify(source)
  let hooks = 0
  for (const method of ['stream', 'streamSimple']) {
    await provider[method](model, source, { apiKey: KEY, sessionId: method, maxTokens: 2048, headers: { 'anthropic-beta': 'fixture-sdk-beta' },
      onPayload: async payload => { hooks++; return { ...payload, metadata: { custom: 'kept' }, max_tokens: 512 } },
    }).result()
  }
  assert.equal(hooks, 2)
  assert.equal(JSON.stringify(source), snapshot)
  for (const request of requests) {
    assert.equal(request.body.metadata.custom, 'kept')
    assert.equal(request.body.max_tokens, 512)
    assert.deepEqual(request.headers.get('anthropic-beta').split(','), ['fixture-sdk-beta'])
    assert.ok(request.body.system.some(block => block.text === source.systemPrompt))
  }
})

test('ambient keys and a caller auth header cannot replace a missing explicit key', async t => {
  const previous = process.env.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_API_KEY = 'sk-ambient-fixture'
  t.after(() => { if (previous === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = previous })
  const requests = capture(t)
  const provider = hostProvider(createApophisCodeProvider())
  const model = provider.getModels().find(item => item.id === MODELS[0])
  const result = await provider.streamSimple(model, { messages: [user] }, { headers: { Authorization: 'Bearer sk-foreign-fixture', 'X-API-Key': 'sk-foreign-header-fixture' } }).result()
  assert.equal(result.stopReason, 'error')
  assert.equal(requests.length, 0)
})

async function route() {
  const ring = new ApophisCodeKeyRing(fakeCredentials())
  await ring.add(KEY, 'native fixture')
  const image = createVisionFixture('red')
  const failures = []
  const adapter = createRouteAdapter({ ring, fallbackSessionId: 'native-fixture', resolveAttachments: () => image.attachments,
    keys: { active: () => ring.activeKey(), forRequest: (_model, key) => key, onKeyFailure: kind => failures.push(kind) },
  })
  async function turn(messages, extra = {}, prepared = true) {
    const result = new BlockAssembler()
    const call = prepared ? await adapter.prepareCall('apophiscode', extra.model ?? 'claude-sonnet-5-5') : adapter
    for await (const chunk of call.stream({ provider: 'apophiscode', model: 'claude-sonnet-5-5', sessionId: 'native-fixture', reasoningEffort: 'low', maxTokens: 2048, messages, ...extra })) result.push(chunk)
    return result
  }
  return { adapter, ring, image, failures, turn }
}

test('the gateway test-message refusal has its own non-key category on direct and prepared calls', async t => {
  const requests = capture(t, () => Response.json({ error: { type: 'gateway_unknown_error', message: "Your client is already connected and authorized. Please use it normally. There is no need to send test messages such as 'hi' or 'hello' to verify the connection." } }, { status: 403 }))
  const { turn, ring, failures } = await route()
  for (const prepared of [true, false]) {
    const result = await turn([createUserMessage({ content: [{ type: 'text', text: '整理这张订单的处理步骤。' }], source: { kind: 'user' } })], { model: MODELS[0] }, prepared)
    assert.equal(result.finish.kind, 'error')
    assert.equal(result.finish.failure.code, 'GATEWAY_TEST_MESSAGE')
    assert.match(result.finish.failure.message, /连通性测试/u)
    assert.doesNotMatch(result.finish.failure.message, /\b403\b/u)
  }
  assert.equal(requests.length, 2, 'the policy must not cause automatic retries')
  assert.deepEqual(failures, [], 'the refusal must not disable or rotate the key')
  assert.equal((await ring.activeKey()).key, KEY)
})

test('native host tools, images and durable tool results roundtrip through Messages', async t => {
  let block = { type: 'tool_use', id: 'tool_echo', name: 'echo', input: { text: 'ok' } }
  const requests = capture(t, request => anthropicStream(request.body.model, block.type === 'tool_use' ? { ...block, name: request.body.tools[0].name } : block))
  const { image, turn } = await route()
  const tools = [{ name: 'echo', description: 'Echo text', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }]
  const messages = [createUserMessage({ content: [{ type: 'text', text: 'Use echo.' }, image.block], source: { kind: 'user' } })]
  const first = await turn(messages, { tools })
  assert.equal(first.finish.kind, 'tool-calls')
  const call = first.blocks().find(item => item.type === 'tool-call')
  assert.equal(call.name, 'echo')
  assert.deepEqual(JSON.parse(call.arguments), { text: 'ok' })
  assert.match(requests[0].body.tools[0].name, /^mcp__apophiscode__echo_/u)
  assert.notEqual(requests[0].body.tool_choice?.type, 'none')
  assert.equal(requests[0].body.messages[0].content.find(item => item.type === 'image').source.data, image.data.toString('base64'))
  messages.push(first.message({ kind: 'model', provider: 'apophiscode', model: 'claude-sonnet-5-5', replayState: first.replayState }))
  messages.push(createToolResultMessage({ callId: call.id, content: [{ type: 'text', text: 'ok' }], isError: false }))
  block = { type: 'text', text: 'ok' }
  const second = await turn(JSON.parse(JSON.stringify(messages)), { tools })
  assert.equal(second.finish.kind, 'stop')
  assert.equal(second.blocks().find(item => item.type === 'text').text, 'ok')
  assert.ok(requests[1].body.messages.flatMap(item => item.content).some(item => item.type === 'tool_result' && item.tool_use_id === call.id))
  assert.equal(requests[1].body.messages.flatMap(item => item.content).find(item => item.type === 'tool_use').name, requests[0].body.tools[0].name)
})

test('direct and prepared Claude titles keep the selected exact model and disable tools', async t => {
  const requests = capture(t)
  const { turn } = await route()
  for (const prepared of [true, false]) for (const model of MODELS) {
    await turn([createUserMessage({ content: [{ type: 'text', text: 'Name this session.' }], source: { kind: 'user' } })], {
      model, purpose: 'session-title', system: 'Only a title.',
      tools: [{ name: 'must_not_run', description: 'Unavailable during titles', parameters: { type: 'object', properties: {} } }],
    }, prepared)
    assert.equal(requests.at(-1).body.model, model)
    assert.deepEqual(requests.at(-1).body.tool_choice, { type: 'none' })
    assert.equal(requests.at(-1).body.tools?.length ?? 0, 0)
    assert.match(requests.at(-1).body.messages.at(-1).content.at(-1).text, /Name the preceding conversation/u)
    assert.ok(requests.at(-1).body.system.some(block => block.text === 'Only a title.'))
    await turn([createUserMessage({ content: [{ type: 'text', text: 'Continue.' }], source: { kind: 'user' } })], { model }, prepared)
    assert.equal(requests.at(-1).body.model, model)
  }
})

test('a native client-policy rejection is explained without disabling the key or spawning a fallback', async t => {
  const requests = capture(t, () => Response.json({ error: { message: 'This API endpoint is only accessible via the official Claude CLI' } }, { status: 403 }))
  const { turn, failures, ring } = await route()
  const result = await turn([createUserMessage({ content: [{ type: 'text', text: 'ok' }], source: { kind: 'user' } })])
  assert.equal(result.finish.kind, 'error')
  assert.match(result.finish.failure.message, /不能证明 API Key 失效/u)
  assert.equal(requests.length, 1)
  assert.deepEqual(failures, [])
  assert.equal((await ring.activeKey()).key, KEY)
})

test('empty signed thinking survives the real host assembler and a persisted tool continuation', async t => {
  let firstResponse = true
  const requests = capture(t, async request => {
    if (!firstResponse) return anthropicStream(request.body.model, { type: 'text', text: '35' })
    firstResponse = false
    const ordinary = await anthropicStream(request.body.model, { type: 'tool_use', id: 'stock_read', name: request.body.tools[0].name, input: { sku: 'KB-87' } }).text()
    const events = ordinary.trim().split('\n\n').map(frame => JSON.parse(frame.split('\n').find(line => line.startsWith('data: ')).slice(6)))
    for (const event of events) if (typeof event.index === 'number') event.index++
    events.splice(1, 0,
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'opaque-thinking-signature' } },
      { type: 'content_block_stop', index: 0 },
    )
    return new Response(events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })
  })
  const { turn } = await route()
  const tools = [{ name: 'lookup_inventory', description: 'Read inventory', parameters: { type: 'object', properties: { sku: { type: 'string' } } } }]
  const messages = [createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: '查询库存' }] })]
  const first = await turn(messages, { model: 'claude-haiku-5-5', tools })
  assert.equal(first.finish.kind, 'tool-calls')
  assert.equal(first.blocks()[0].text, '')
  assert.equal(first.replayState.blocks[0].thinkingSignature, 'opaque-thinking-signature')
  messages.push(first.message({ kind: 'model', provider: 'apophiscode', model: 'claude-haiku-5-5', replayState: first.replayState }))
  messages.push(createToolResultMessage({ callId: 'stock_read', content: [{ type: 'text', text: '35' }], isError: false }))
  await turn(JSON.parse(JSON.stringify(messages)), { model: 'claude-haiku-5-5', tools })
  const thinking = requests[1].body.messages.flatMap(message => message.content).find(block => block.type === 'thinking')
  assert.equal(thinking.thinking, '')
  assert.equal(thinking.signature, 'opaque-thinking-signature')
})
