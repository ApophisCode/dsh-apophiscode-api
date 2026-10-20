import assert from 'node:assert/strict'
import test from 'node:test'
import { createPluginHost, textOf } from './plugin-host-fixture.mjs'
import { eventStream, responseFrames } from './fixtures/openai.mjs'
import { requestedModelProtocol } from '../src/model-protocol-policy.js'
import { createModelProtocolResolver } from '../src/model-protocol.js'

test('the family policy is limited to DeepSeek IDs and does not infer effort capabilities', () => {
  for (const id of ['gpt-6.1-sol', 'claude-opus-4-8', 'gemini-future', 'deepseeker-model', 'gateway/deepseek-v4.1-flash']) {
    assert.equal(requestedModelProtocol(id), undefined)
  }
})

test('an explicit transport policy remains distinct from gateway declarations and SDK references', async () => {
  const resolver = createModelProtocolResolver({ fetchImpl: () => assert.fail('no probe') })
  const model = await resolver.resolve({ apiHost: 'https://gateway.example', key: 'sk-offline-policy', id: 'deepseek-future',
    row: { api: 'openai-completions', context_window: 1234, reasoning_efforts: ['high'] },
    referenceApi: 'anthropic-messages', requestedApi: 'openai-responses' })
  assert.equal(model.source, 'plugin-policy')
  assert.equal(model.api, 'openai-responses')
  assert.equal(model.contextWindow, 1234)
  assert.deepEqual(model.reasoningEfforts, { high: 'high' })
  await assert.rejects(resolver.resolve({ apiHost: 'https://gateway.example', key: 'sk-offline-policy', id: 'unknown', requestedApi: 'unimplemented' }), /unimplemented protocol/u)
})

for (const id of ['deepseek-v4.1-flash', 'deepseek-v4-pro', 'deepseek-future-2040', 'DeepSeek-Future']) {
  test(`${id}: the requested DeepSeek transport policy uses Responses without a probe or model rewrite`, async t => {
    const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: call => {
      assert.equal(new URL(call.url).pathname, '/v1/responses')
      assert.equal(call.body.stream, true)
      assert.equal(call.body.model, id)
      return eventStream(responseFrames(id, { textParts: ['OK'] }))
    } })
    assert.deepEqual((await plugin.adapter.listModels('apophiscode')).map(m => [m.id, m.name]), [[id, id]])
    await plugin.adapter.prepareCall('apophiscode', id)
    assert.equal(plugin.requests.length, 0)
    const result = await plugin.turn({ model: id })
    assert.equal(result.assembled.finish.kind, 'stop')
    assert.equal(textOf(result.assembled), 'OK')
    assert.equal(plugin.requests.length, 1)
  })
}

test('the explicit DeepSeek Responses policy also applies when a directory declares another protocol', async t => {
  const id = 'deepseek-fixture-model'
  const plugin = await createPluginHost(t, { modelIds: [{ id, api: 'openai-completions', reasoning_efforts: ['high'] }], respond: call => {
    assert.equal(new URL(call.url).pathname, '/v1/responses')
    assert.equal(call.body.reasoning.effort, 'high')
    return eventStream(responseFrames(id, { textParts: ['OK'] }))
  } })
  assert.equal((await plugin.turn({ model: id, reasoningEffort: 'high' })).assembled.finish.kind, 'stop')
  assert.equal(plugin.requests.length, 1)
})

test('a DeepSeek business 502 is returned once without a protocol probe or alternate endpoint', async t => {
  const id = 'deepseek-v4.1-flash'
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: () => Response.json({ error: { message: 'upstream unavailable' } }, { status: 502 }) })
  const result = await plugin.turn({ model: id, reasoningEffort: 'low' })
  assert.equal(result.assembled.finish.kind, 'error')
  assert.match(result.assembled.finish.failure.message, /upstream unavailable/u)
  assert.equal(plugin.requests.length, 1)
  assert.equal(new URL(plugin.requests[0].url).pathname, '/v1/responses')
  assert.equal(plugin.requests[0].body.stream, true)
})

test('DeepSeek Responses keeps the real DSH tool execution and continuation', async t => {
  const id = 'deepseek-v4.1-flash'
  const plugin = await createPluginHost(t, { modelIds: [{ id }], respond: ({ index, body, url }) => {
    assert.equal(new URL(url).pathname, '/v1/responses')
    assert.equal(body.reasoning.effort, 'low')
    return eventStream(responseFrames(id, index === 1
      ? { tool: { id: 'call_policy', name: 'lookup_memory', argumentsParts: ['{"query":"中文"}'] } }
      : { textParts: ['已完成。'] }))
  } })
  const result = await plugin.toolRoundTrip({ model: id, reasoningEffort: 'low', expectedArguments: { query: '中文' } })
  assert.equal(textOf(result.second), '已完成。')
  assert.equal(result.executed, 1)
  assert.equal(plugin.requests.length, 2)
})
