import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { createPluginHost, textOf } from './plugin-host-fixture.mjs'
import { eventStream, responseFrames, chatFrames } from './fixtures/openai.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'
import { createReasoningReferences, reasoningReference } from '../src/model-reasoning.js'

const ids = ['deepseek-v4-pro', 'gpt-6.1-sol', 'claude-opus-4-8', 'claude-opus-5-5', 'opaque-future-model']

test('a raw ID present only in supplementary SDK catalogs has its exact efforts and protocol', async t => {
  const id = 'deepseek-v4.1-flash'
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: () => {
    assert.fail('an exact SDK protocol must not send a verification request, including one that could return 502')
  } })
  const [model] = await plugin.adapter.listModels('apophiscode')
  assert.equal(model.id, id)
  assert.equal(model.name, id)
  assert.deepEqual(model.reasoning?.efforts.map(effort => effort.id), ['low', 'high', 'max'])
  assert.equal(model.reasoning.defaultEffort, undefined)
  assert.equal(model.context, undefined)
  assert.equal(model.inputModalities, undefined)
  await plugin.adapter.prepareCall('apophiscode', id)
  assert.equal(plugin.requests.length, 0)
  assert.equal(reasoningReference(id).api, 'openai-completions')
  assert.equal(reasoningReference(id).reference, undefined, 'other gateways never supply transport configuration')
})

for (const reasoningEffort of [undefined, 'low', 'high', 'max']) test(`supplementary SDK ID: ${reasoningEffort ?? 'Default'} crosses the registered adapter without a protocol probe`, async t => {
  const id = 'deepseek-v4.1-flash'
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: call => {
    assert.equal(new URL(call.url).pathname, '/v1/responses')
    assert.equal(call.body.stream, true)
    return eventStream(responseFrames(id, { textParts: ['OK'] }))
  } })
  const result = await plugin.turn({ model: id, reasoningEffort })
  assert.equal(result.assembled.finish.kind, 'stop')
  assert.equal(textOf(result.assembled), 'OK')
  assert.equal(plugin.requests.length, 1)
  assert.equal(plugin.requests[0].body.model, id)
  assert.equal(plugin.requests[0].body.reasoning?.effort, reasoningEffort)
  assert.equal(plugin.requests[0].body.max_output_tokens, 2048)
  assert.equal(plugin.requests[0].body.thinking, undefined, 'no foreign gateway-specific encoder settings')
})

test('supplementary SDK catalogs compare capability fields independently and never import supplier configuration', () => {
  const id = 'fixture-catalog-model', levels = { off: null, minimal: null, low: 'low', medium: null, high: 'high', xhigh: null, max: 'max' }
  const row = { id, api: 'openai-completions', reasoning: true, thinkingLevelMap: levels }
  const rows = [{ ...row, provider: 'supplier-a', baseUrl: 'https://a.invalid', compat: { thinkingFormat: 'qwen' } },
    { ...row, provider: 'supplier-b', baseUrl: 'https://b.invalid', compat: { thinkingFormat: 'deepseek' } }]
  assert.deepEqual(createReasoningReferences([], rows)(id), { api: row.api, reasoningEfforts: { low: 'low', high: 'high', max: 'max' } })
  const apiConflict = createReasoningReferences([], [row, { ...row, api: 'openai-responses' }])(id)
  assert.equal(apiConflict.api, undefined)
  assert.deepEqual(apiConflict.reasoningEfforts, { low: 'low', high: 'high', max: 'max' })
  const effortConflict = createReasoningReferences([], [row, { ...row, reasoning: false }])(id)
  assert.equal(effortConflict.api, row.api)
  assert.equal(effortConflict.reasoningEfforts, undefined)
  assert.equal(createReasoningReferences([], [{ ...row, api: 'unimplemented-protocol' }])(id), undefined)
  assert.equal(createReasoningReferences([], rows)(id + '-renamed'), undefined)
  const primary = { ...row, api: 'anthropic-messages' }
  assert.equal(createReasoningReferences([{ getModels: () => [primary] }], rows)(id).reference, primary)
})

test('supplementary SDK protocol retains a real business 502 without probing or replaying', async t => {
  const id = 'deepseek-v4.1-flash'
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: () => Response.json({ error: { message: 'upstream unavailable' } }, { status: 502 }) })
  const result = await plugin.turn({ model: id, reasoningEffort: 'high' })
  assert.equal(result.assembled.finish.kind, 'error')
  assert.match(result.assembled.finish.failure.message, /upstream unavailable/u)
  assert.equal(plugin.requests.length, 1)
  assert.equal(new URL(plugin.requests[0].url).pathname, '/v1/responses')
  assert.equal(plugin.requests[0].body.stream, true)
})

test('raw active-key IDs retain order and receive distinct exact SDK reasoning metadata', async t => {
  const plugin = await createPluginHost(t, { modelIds: ids.map(id => ({ id })), respond: () => assert.fail('listing never probes') })
  const models = await plugin.adapter.listModels('apophiscode')
  assert.deepEqual(models.map(model => [model.id, model.name]), ids.map(id => [id, id]))
  const levels = id => models.find(model => model.id === id).reasoning?.efforts.map(effort => effort.id)
  assert.deepEqual(levels('deepseek-v4-pro'), ['off', 'high', 'max'])
  assert.ok(levels('gpt-6.1-sol').includes('high'))
  assert.deepEqual(levels('claude-opus-4-8'), ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
  assert.deepEqual(levels('claude-opus-5-5'), ['low', 'medium', 'high', 'xhigh', 'max'])
  assert.equal(levels('opaque-future-model'), undefined)
  for (const model of models) {
    assert.equal(model.reasoning?.defaultEffort, undefined)
    assert.equal(model.context, undefined)
    assert.equal(model.inputModalities, undefined)
  }
  const runtime = new LlmRuntime(new Context())
  const dispose = runtime.registerAdapter(['apophiscode'], plugin.adapter)
  t.after(dispose)
  assert.equal((await runtime.resolveCallConfig({ provider: 'apophiscode', model: 'claude-opus-5-5', reasoningEffort: 'xhigh' })).reasoningEffort, 'xhigh')
  await assert.rejects(runtime.resolveCallConfig({ provider: 'apophiscode', model: 'claude-opus-5-5', reasoningEffort: 'off' }), error => error.code === 'UNSUPPORTED_REASONING_EFFORT')
  assert.deepEqual(await runtime.resolveCallConfig({ provider: 'apophiscode', model: 'gpt-6.1-sol' }), { provider: 'apophiscode', model: 'gpt-6.1-sol' })
})

for (const [id, api, reasoningEffort] of [
  ['deepseek-v4-pro', 'openai-responses', 'max'],
  ['gpt-6.1-sol', 'openai-responses', 'high'],
  ['claude-opus-4-8', 'anthropic-messages', 'high'],
  ['claude-opus-5-5', 'anthropic-messages', 'xhigh'],
]) test(`${id}: SDK effort crosses the registered adapter and the selected protocol without a model override`, async t => {
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: call => {
    if (call.body.stream !== true) {
      if (api === 'openai-completions') return Response.json({ choices: [{ message: { content: 'OK' } }] })
      if (api === 'anthropic-messages') return Response.json({ type: 'message', content: [{ type: 'text', text: 'OK' }] })
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }] })
    }
    return api === 'openai-completions' ? eventStream(chatFrames(id, { textParts: ['OK'] }))
      : api === 'anthropic-messages' ? anthropicStream(id) : eventStream(responseFrames(id, { textParts: ['OK'] }))
  } })
  const result = await plugin.turn({ model: id, reasoningEffort })
  assert.equal(result.assembled.finish.kind, 'stop')
  assert.ok(textOf(result.assembled).trim())
  assert.equal(plugin.requests.length, 1, 'an exact SDK protocol does not require a separate text probe')
  const [business] = plugin.requests
  const endpoint = api === 'openai-completions' ? '/v1/chat/completions' : api === 'anthropic-messages' ? '/v1/messages' : '/v1/responses'
  assert.equal(new URL(business.url).pathname, endpoint)
  assert.equal(business.body.model, id)
  if (api === 'anthropic-messages') {
    assert.equal(business.body.thinking.type, 'adaptive')
    const activeEffort = business.body.messages.at(-1)?.output_config?.effort ?? business.body.output_config.effort
    assert.equal(activeEffort, reasoningEffort)
  } else if (api === 'openai-responses') assert.equal(business.body.reasoning.effort, reasoningEffort)
  else assert.equal(business.body.reasoning_effort, reasoningEffort)
})

test('gateway effort declarations override SDK metadata for the same exact ID', async t => {
  const id = 'claude-opus-4-8'
  const plugin = await createPluginHost(t, { modelIds: [{ id, api: 'openai-responses', reasoning_efforts: ['low'] }], respond: () => assert.fail('no invocation') })
  const model = await plugin.adapter.resolveModel('apophiscode', id)
  assert.deepEqual(model.reasoning.efforts.map(effort => effort.id), ['low'])
})

test('SDK lookup does not infer metadata for prefixed, dated or renamed IDs', async t => {
  const ids = ['gateway/claude-opus-4-8', 'claude-opus-4-8-20401231', 'gpt-6.1-sol-high', 'DeepSeek-UNKNOWN']
  const plugin = await createPluginHost(t, { modelIds: ids.map(id => ({ id })), respond: () => assert.fail('listing never probes') })
  const models = await plugin.adapter.listModels('apophiscode')
  assert.deepEqual(models.map(model => model.id), ids)
  assert.ok(models.every(model => model.reasoning === undefined))
})

for (const [id, api] of [['deepseek-v4-pro', 'openai-responses'], ['gpt-6.1-sol', 'openai-responses'], ['claude-opus-4-8', 'anthropic-messages']]) {
  test(`${id}: Off is sent only when the exact SDK model supports it`, async t => {
    const plugin = await createPluginHost(t, { modelIds: [{ id, api }], respond: () => api === 'anthropic-messages'
      ? anthropicStream(id) : eventStream(api === 'openai-responses' ? responseFrames(id) : chatFrames(id)) })
    if (id === 'gpt-6.1-sol') {
      await assert.rejects(plugin.turn({ model: id, reasoningEffort: 'off' }), error => error.code === 'UNSUPPORTED_REASONING_EFFORT')
      assert.equal(plugin.requests.length, 0)
      return
    }
    assert.equal((await plugin.turn({ model: id, reasoningEffort: 'off' })).assembled.finish.kind, 'stop')
    const body = plugin.requests[0].body
    if (api === 'openai-responses') assert.equal(body.reasoning.effort, 'none')
    else assert.equal(body.thinking.type, 'disabled')
  })
  test(`${id}: SDK metadata does not force an effort when Default is selected`, async t => {
    const plugin = await createPluginHost(t, { modelIds: [{ id, api }], respond: () => api === 'anthropic-messages'
      ? anthropicStream(id) : eventStream(api === 'openai-responses' ? responseFrames(id) : chatFrames(id)) })
    assert.equal((await plugin.turn({ model: id })).assembled.finish.kind, 'stop')
    const body = plugin.requests[0].body
    assert.equal(body.reasoning, undefined)
    assert.equal(body.reasoning_effort, undefined)
    assert.equal(body.thinking, undefined)
    assert.equal(body.output_config?.effort, undefined)
  })
}

test('legacy SDK thinking budgets respect explicit output caps without lowering the selected effort', async t => {
  const id = 'claude-haiku-4-5'
  const plugin = await createPluginHost(t, { modelIds: [{ id, api: 'anthropic-messages' }], respond: () => anthropicStream(id) })
  assert.equal((await plugin.turn({ model: id, reasoningEffort: 'high', maxTokens: 20000 })).assembled.finish.kind, 'stop')
  assert.equal(plugin.requests[0].body.max_tokens, 20000)
  assert.equal(plugin.requests[0].body.thinking.type, 'enabled')
  assert.equal(plugin.requests[0].body.thinking.budget_tokens, 16384)
  const failed = await plugin.turn({ model: id, reasoningEffort: 'high', maxTokens: 128 })
  assert.equal(failed.assembled.finish.kind, 'error')
  assert.match(failed.assembled.finish.failure.message, /output limit is too small/u)
  assert.equal(plugin.requests.length, 1)
})

for (const [id, endpoint, reasoningEffort] of [['claude-opus-4-7', '/v1/messages', 'high'], ['gpt-4.1', '/v1/responses', undefined]]) test(`${id}: an exact SDK protocol preserves rejection without probing or protocol fallback`, async t => {
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: () => Response.json({ error: { message: 'unsupported request parameter' } }, { status: 400 }) })
  const prepared = await plugin.adapter.prepareCall('apophiscode', id)
  assert.equal(plugin.requests.length, 0)
  const result = await plugin.turn({ model: id, reasoningEffort })
  assert.equal(result.assembled.finish.kind, 'error')
  assert.match(result.assembled.finish.failure.message, /unsupported request parameter/u)
  assert.equal(plugin.requests.length, 1)
  assert.equal(new URL(plugin.requests[0].url).pathname, endpoint)
  assert.equal(plugin.requests[0].body.stream, true)
  assert.equal(prepared.model.id, id)
})
