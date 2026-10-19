import assert from 'node:assert/strict'
import test from 'node:test'

import { Context } from '@deepseek-ai/cordis'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { LlmAdapter, LlmRuntime } from '@deepseek-ai/dsh-llm'

import { createApophisCodeCatalog, APOPHISCODE_MODELS, APOPHISCODE_MODEL_IDS } from '../src/catalog.js'
import { DEFAULT_REASONING_LEVEL } from '../src/constants.js'
import { apply } from '../src/index.js'
import { singleKeyRecord } from './helpers.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'

const KEY = 'sk-apophis-routing-offline-fixture'
const PROVIDER = 'apophiscode'
const TEXT = '你好 routing'
const byId = id => createApophisCodeCatalog(undefined, { includeLegacy: true }).find(model => model.id === id)

/** The real plugin registration and writable section seam, without a running DSH. */
function host({ apiHost, section = true, llm } = {}) {
  const records = new Map([[credentialKey('apophiscode-api', 'keys'), singleKeyRecord(KEY)]])
  let values, hooks
  const seen = { adapter: undefined, handler: undefined, notifications: 0 }
  const config = { apiHost, claudeTransport: 'http', claudeCliPath: '/nonexistent/apophis-routing-cli' }
  const settings = {
    async update(namespace, patch) {
      assert.equal(namespace, 'apophiscode-api')
      values = { ...values, ...patch }
      hooks?.onChange()
    },
  }
  if (section) settings.installSection = (_owner, _namespace, _schema, entry, callbacks) => {
    values = entry
    hooks = callbacks
    hooks.setSource(() => values)
  }
  const ctx = {
    credentials: {
      async readRecord(key) { return records.get(key) },
      async modifyRecord(key, mutate) {
        const record = await mutate(records.get(key))
        if (record !== undefined) records.set(key, record)
        return records.get(key)
      },
    },
    logger: { warn() {} },
    llm: {
      registerAdapter(providers, adapter) {
        seen.adapter = adapter
        if (llm !== undefined) return llm.registerAdapter(providers, adapter)
        const handle = () => {}
        handle.replace = () => { seen.notifications += 1 }
        return handle
      },
      registerConfigurableProviders: entries => llm?.registerConfigurableProviders(entries),
    },
    get: () => undefined,
    effect: callback => callback(),
    inject(names, callback) {
      if (names.includes('settings')) return callback({ settings })
      if (names.includes('connection')) return callback({ effect: ctx.effect, connection: {
        rpc: { handle(_channel, handler) { seen.handler = handler; return () => {} } },
      } })
    },
  }
  apply(ctx, config)
  return seen
}

const options = (model, extra = {}) => ({
  provider: PROVIDER, model, sessionId: 'routing-session', maxTokens: 256, reasoningEffort: 'high',
  messages: [{ role: 'user', content: [{ type: 'text', text: '你好' }] }],
  ...extra,
})

async function drain(stream, onChunk) {
  const chunks = []
  for await (const chunk of stream) { chunks.push(chunk); onChunk?.(chunk) }
  assert.equal(chunks.at(-1)?.reason?.kind, 'stop', JSON.stringify(chunks.at(-1)))
  assert.equal(chunks.filter(chunk => chunk.type === 'text-delta').map(chunk => chunk.text).join(''), TEXT)
  return chunks
}

const sse = events => new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), {
  headers: { 'content-type': 'text/event-stream' },
})

/** Protocol frames are decoded by the real SDKs and the registered PiAiAdapter. */
function answered(model) {
  const api = byId(model).api
  if (api === 'anthropic-messages') return anthropicStream(model, { type: 'text', text: TEXT })
  if (api === 'google-generative-ai') return sse([{
    candidates: [{ content: { role: 'model', parts: [{ text: TEXT }] }, finishReason: 'STOP', index: 0 }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 }, modelVersion: model,
  }])
  if (api === 'openai-completions') return sse([
    { id: 'chat_fixture', object: 'chat.completion.chunk', created: 1, model, choices: [{ index: 0, delta: { role: 'assistant', content: TEXT }, finish_reason: null }] },
    { id: 'chat_fixture', object: 'chat.completion.chunk', created: 1, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
  ])
  const item = { type: 'message', id: 'msg_fixture', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: TEXT, annotations: [] }] }
  return sse([
    { type: 'response.created', sequence_number: 0, response: { id: 'resp_fixture', object: 'response', status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
    { type: 'response.content_part.added', output_index: 0, content_index: 0, item_id: item.id, part: { type: 'output_text', text: '', annotations: [] } },
    { type: 'response.output_text.delta', output_index: 0, content_index: 0, item_id: item.id, delta: TEXT },
    { type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response: { id: 'resp_fixture', status: 'completed', output: [item], usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } } },
  ])
}

function capture(t, respond = call => answered(call.model)) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    if (request.method === 'GET') return new URL(request.url).pathname.endsWith('/v1/models')
      ? Response.json({ data: APOPHISCODE_MODEL_IDS.map(id => ({ id })) })
      : Response.json({ code: 0, data: { groups: [] } })
    const body = await request.json()
    const model = body.model ?? new URL(request.url).pathname.match(/\/models\/([^:]+)/u)?.[1]
    assert.ok(byId(model), `unexpected request: ${request.url}`)
    const call = { url: request.url, headers: request.headers, body, model }
    requests.push(call)
    return respond(call, requests.length)
  })
  return requests
}

function assertDestination(call, root, model) {
  const paths = {
    'openai-completions': '/v1/chat/completions',
    'openai-responses': '/v1/responses',
    'anthropic-messages': '/v1/messages?beta=true',
    'google-generative-ai': `/v1beta/models/${model}:streamGenerateContent?alt=sse`,
  }
  assert.equal(call.url, `${root}${paths[byId(model).api]}`, model)
  assert.equal(call.model, model)
  if (byId(model).api === 'google-generative-ai') assert.equal(call.headers.get('x-goog-api-key'), KEY)
  else assert.equal(call.headers.get('authorization'), `Bearer ${KEY}`)
}

for (const suffix of ['', '/v1/', '/v1beta/']) {
  test(`the registered adapter routes supported models from a configured root${suffix || ' without a version prefix'}`, async t => {
    const requests = capture(t)
    const root = 'https://relay.example/gateway'
    const { adapter, handler } = host({ apiHost: `${root}${suffix}` })
    assert.deepEqual((await adapter.listModels(PROVIDER)).map(model => model.id), [...APOPHISCODE_MODEL_IDS])
    assert.deepEqual((await handler('models/status')).value.models.map(model => model.id), [...APOPHISCODE_MODEL_IDS])
    for (const model of APOPHISCODE_MODEL_IDS) {
      const resolved = await adapter.resolveModel(PROVIDER, model)
      const prepared = await adapter.prepareCall(PROVIDER, model)
      assert.deepEqual(prepared.model, resolved)
      assert.equal(prepared.model.reasoning.defaultEffort, DEFAULT_REASONING_LEVEL)
      await drain(prepared.stream(options(model)))
      assertDestination(requests.at(-1), root, model)
    }
    assert.equal(requests.length, APOPHISCODE_MODEL_IDS.length)
  })
}

test('a profile without a settings section uses its configured model host', async t => {
  const requests = capture(t)
  const { adapter } = host({ apiHost: 'https://profile.example/custom/v1/', section: false })
  await drain(adapter.stream(options('deepseek-v4.1-flash')))
  assertDestination(requests[0], 'https://profile.example/custom', 'deepseek-v4.1-flash')
})

for (const model of ['deepseek-v4.1-flash', 'gpt-6-astra', 'claude-sonnet-5-5', 'gemini-4-argon']) {
  test(`${model}: new calls follow host changes and already prepared calls keep their destination`, async t => {
    const requests = capture(t)
    const { adapter, handler } = host({ apiHost: 'https://first.example/gateway/v1' })
    const old = await adapter.prepareCall(PROVIDER, model)
    const updated = await handler('hosts/update', { apiHost: 'https://second.example/proxy/v1beta/' })
    assert.equal(updated.ok, true)
    const next = await adapter.prepareCall(PROVIDER, model)
    await drain(next.stream(options(model)))
    assertDestination(requests.at(-1), 'https://second.example/proxy', model)
    await drain(old.stream(options(model)))
    assertDestination(requests.at(-1), 'https://first.example/gateway', model)
    await drain(adapter.stream(options(model)))
    assertDestination(requests.at(-1), 'https://second.example/proxy', model)

    if (model === 'gpt-6-astra' || model === 'claude-sonnet-5-5') {
      const title = model === 'gpt-6-astra' ? 'gpt-6.1-sol' : model
      await drain(old.stream(options(model, { purpose: 'session-title' })))
      assertDestination(requests.at(-1), 'https://first.example/gateway', title)
    }
  })
}

test('an in-flight stream completes on its original host while a new call uses the changed host', { timeout: 5000 }, async t => {
  const started = Promise.withResolvers()
  let release
  const requests = capture(t, async (call, count) => {
    if (count !== 1) return answered(call.model)
    const frames = await answered(call.model).text()
    const end = frames.indexOf('event: message_delta')
    assert.ok(end > 0)
    const encoder = new TextEncoder()
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(encoder.encode(frames.slice(0, end)))
      release = () => { controller.enqueue(encoder.encode(frames.slice(end))); controller.close() }
    } }), { headers: { 'content-type': 'text/event-stream' } })
  })
  const model = 'claude-sonnet-5-5'
  const { adapter, handler } = host({ apiHost: 'https://first.example' })
  const prepared = await adapter.prepareCall(PROVIDER, model)
  const flight = drain(prepared.stream(options(model)), chunk => {
    if (chunk.type === 'text-delta') started.resolve()
  })
  t.after(() => release?.())
  await Promise.race([started.promise, flight])
  assert.equal((await handler('hosts/update', { apiHost: 'https://second.example' })).ok, true)
  await drain((await adapter.prepareCall(PROVIDER, model)).stream(options(model)))
  const finish = release
  release = undefined
  finish()
  await flight
  assertDestination(requests[0], 'https://first.example', model)
  assertDestination(requests[1], 'https://second.example', model)
  assert.equal(requests.length, 2)
})

test('hiding every model affects discovery while an existing session can still resolve and request its model', async t => {
  const requests = capture(t)
  const model = 'gpt-6.1-sol'
  const { adapter, handler } = host({ apiHost: 'https://relay.example' })
  const prepared = await adapter.prepareCall(PROVIDER, model)
  assert.equal((await handler('models/update', { selectedIds: [] })).ok, true)
  assert.deepEqual(await adapter.listModels(PROVIDER), [])
  assert.equal((await adapter.resolveModel(PROVIDER, model)).id, model)
  await drain(prepared.stream(options(model)))
  await drain((await adapter.prepareCall(PROVIDER, model)).stream(options(model)))
  assert.equal(requests.length, 2)
  assert.ok((await handler('models/update', { selectedIds: [...APOPHISCODE_MODEL_IDS] })).value.models.every(model => model.selected))
  assert.deepEqual((await adapter.listModels(PROVIDER)).map(model => model.id), [...APOPHISCODE_MODEL_IDS])
})

test('the real DSH registry keeps another provider route and prepared session separate from Apophis', async t => {
  const requests = capture(t)
  const llm = new LlmRuntime(new Context())
  const oldCalls = []
  // A sentinel for an already installed plugin; no external request is sent.
  class ExistingProvider extends LlmAdapter {
    providerInfo() { return { id: 'other-provider', name: 'other provider' } }
    async listModels() { return [{ provider: 'other-provider', id: 'claude-sonnet-5-5', name: 'Existing model' }] }
    async *stream(call) { oldCalls.push(call); yield { type: 'finish', reason: { kind: 'stop' } } }
  }
  const oldRegistration = llm.registerAdapter(['other-provider'], new ExistingProvider())
  const oldDirectory = llm.registerConfigurableProviders([{ provider: 'other-provider', displayName: 'other provider', settingsNs: 'other-provider-api', settingsPath: [] }])
  t.after(() => { oldDirectory(); oldRegistration() })
  const oldConfig = { provider: 'other-provider', model: 'claude-sonnet-5-5' }
  const existing = await llm.prepareCall(oldConfig)
  const { handler } = host({ apiHost: 'https://relay.example', llm })
  assert.deepEqual(llm.listProviders().map(provider => provider.id), ['other-provider', 'apophiscode'])
  assert.deepEqual(llm.listConfigurableProviders().map(entry => [entry.provider, entry.settingsNs]), [
    ['other-provider', 'other-provider-api'], ['apophiscode', 'apophiscode-api'],
  ])
  const own = await llm.prepareCall({ provider: PROVIDER, model: oldConfig.model, maxTokens: 256, reasoningEffort: 'low' })
  await drain(own.stream({ ...options(oldConfig.model), ...own.config }))
  assertDestination(requests[0], 'https://relay.example', oldConfig.model)
  await handler('models/update', { selectedIds: [] })
  assert.deepEqual((await llm.listModels('other-provider')).map(model => model.id), [oldConfig.model])
  for await (const _ of existing.stream({ ...existing.config, messages: options(oldConfig.model).messages })) { /* Drain the old route. */ }
  assert.equal(oldCalls.length, 1)
  assert.equal(oldCalls[0].provider, 'other-provider')
  assert.deepEqual(oldConfig, { provider: 'other-provider', model: 'claude-sonnet-5-5' })
  assert.equal(requests.length, 1)
})
