import assert from 'node:assert/strict'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'

import { eventStream, responseFrames } from './fixtures/openai.mjs'
import { createPluginHost, PLUGIN_TEST_KEY, textOf, userMessage } from './plugin-host-fixture.mjs'

const plugin = process.env.APOPHIS_TEST_ENTRY
  ? await import(pathToFileURL(process.env.APOPHIS_TEST_ENTRY).href)
  : await import('../src/index.js')
const QUERY = '中文内存📦'
const ARGUMENT_PARTS = ['{"query":"中文', '内存', '📦"}']
const THOUGHT = '先查中文内存。'
const REASONING_ITEM = Object.freeze({
  type: 'reasoning', id: 'rs_deepseek_fixture', status: 'completed', summary: [],
  content: [{ type: 'reasoning_text', text: THOUGHT }], encrypted_content: 'offline-deepseek-reference',
})

function firstFrames(reasoningEffort) {
  const frames = responseFrames('deepseek-v4.1-flash', {
    tool: { id: 'call_deepseek_memory', name: 'lookup_memory', argumentsParts: ARGUMENT_PARTS },
  })
  if (reasoningEffort === 'off') return frames
  const [created, ...toolFrames] = frames
  return [created,
    { type: 'response.output_item.added', output_index: 0, item: { ...REASONING_ITEM, status: 'in_progress', content: [] } },
    ...['先查', '中文内存。'].map(delta => ({ type: 'response.reasoning_text.delta', output_index: 0, content_index: 0, item_id: REASONING_ITEM.id, delta })),
    { type: 'response.output_item.done', output_index: 0, item: REASONING_ITEM },
    ...toolFrames.map(frame => frame.type === 'response.completed'
      ? { ...frame, response: { ...frame.response, output: [REASONING_ITEM, ...frame.response.output] } }
      : frame.output_index === undefined ? frame : { ...frame, output_index: 1 }),
  ]
}

for (const [reasoningEffort, wireEffort] of [['low', 'low'], ['off', 'none']]) {
  test(`DeepSeek ${reasoningEffort}: registered adapter uses Responses for streamed tools and persisted results`, async t => {
    const host = await createPluginHost(t, {
      applyPlugin: plugin.apply,
      config: { apiHost: 'https://gateway.example/proxy/v1' },
      respond: call => eventStream(call.index === 1 ? firstFrames(reasoningEffort)
        : responseFrames('deepseek-v4.1-flash', { textParts: ['内存', '读取完成：', '中文📦。'] }), { bytewise: true }),
    })

    let result
    try {
      result = await host.toolRoundTrip({
        model: 'deepseek-v4.1-flash', reasoningEffort, expectedArguments: { query: QUERY },
      })
    } finally {
      // Assert outside fetch so the SDK cannot wrap a route mismatch as a transport error.
      assert.ok(host.requests.length > 0)
      for (const call of host.requests) {
        // The expected route is fixed independently of the catalog declaration.
        assert.equal(call.url, 'https://gateway.example/proxy/v1/responses')
        assert.equal(call.headers.get('authorization'), `Bearer ${PLUGIN_TEST_KEY}`)
        assert.equal(call.request.redirect, 'error')
        assert.equal(call.body.model, 'deepseek-v4.1-flash')
        assert.equal(call.body.stream, true)
        assert.equal(call.body.reasoning.effort, wireEffort)
        assert.equal(call.body.messages, undefined)
        assert.equal(call.body.thinking, undefined)
        assert.equal(call.body.reasoning_effort, undefined)
        assert.equal(call.body.max_tokens, undefined)
        assert.equal(call.body.max_output_tokens, 2048)
        assert.equal(call.body.prompt_cache_key, 'plugin-host-fixture-session')
        assert.equal(call.body.prompt_cache_retention, undefined)
        assert.equal(call.body.input[0].role, 'developer')
        assert.equal(call.body.tools[0].type, 'function')
        assert.equal(call.body.tools[0].name, 'lookup_memory')
      }
    }
    assert.equal(result.executed, 1)
    assert.equal(host.executions[0].callId, result.call.id)
    assert.deepEqual(host.executions[0].arguments, { query: QUERY })
    assert.equal(result.firstChunks.filter(chunk => chunk.type === 'tool-call-delta').map(chunk => chunk.argumentsDelta).join(''), JSON.stringify({ query: QUERY }))
    assert.equal(textOf(result.second), '内存读取完成：中文📦。')
    assert.ok(result.secondChunks.filter(chunk => chunk.type === 'text-delta').length >= 3)
    const [first, second] = result.requests.map(call => call.body)
    assert.equal(first.input.some(item => item.type === 'function_call_output'), false)
    const call = second.input.find(item => item.type === 'function_call')
    const output = second.input.find(item => item.type === 'function_call_output')
    assert.equal(call.call_id, 'call_deepseek_memory')
    assert.deepEqual(JSON.parse(call.arguments), { query: QUERY })
    assert.equal(output.call_id, call.call_id)
    assert.ok(JSON.stringify(output.output).includes(`内存记录：${QUERY}`))
    const reasoning = second.input.find(item => item.type === 'reasoning')
    if (reasoningEffort === 'off') {
      assert.deepEqual(first.reasoning, { effort: 'none' })
      assert.equal(first.include, undefined)
      assert.equal(reasoning, undefined)
    } else {
      assert.ok(first.include.includes('reasoning.encrypted_content'))
      assert.equal(result.firstChunks.filter(chunk => chunk.type === 'reasoning-delta').map(chunk => chunk.text).join(''), THOUGHT)
      assert.deepEqual(reasoning, REASONING_ITEM)
      assert.ok(second.input.indexOf(reasoning) < second.input.indexOf(call))
    }
  })
}

test('DeepSeek Responses continues persisted Chat thinking as ordinary assistant history', async t => {
  const host = await createPluginHost(t, { applyPlugin: plugin.apply,
    respond: () => eventStream(responseFrames('deepseek-v4.1-flash', { textParts: ['继续', '中文对话。'] }), { bytewise: true }),
  })
  const legacy = createAssistantMessage({
    source: { provider: 'apophiscode', model: 'deepseek-v4.1-flash', replayState: {
      response: { kind: 'pi-ai', version: 2, api: 'openai-completions', provider: 'apophiscode', model: 'deepseek-v4.1-flash', stopReason: 'stop' },
      blocks: [{ type: 'reasoning' }, { type: 'text' }],
    } },
    content: [{ type: 'reasoning', text: '旧 Chat 思考。' }, { type: 'text', text: '旧 Chat 回答。' }],
  })
  const result = await host.turn({ model: 'deepseek-v4.1-flash', messages: JSON.parse(JSON.stringify([
    userMessage('上一轮问题。'), legacy, userMessage('继续。'),
  ])) })
  assert.equal(result.assembled.finish.kind, 'stop')
  assert.equal(textOf(result.assembled), '继续中文对话。')
  assert.equal(host.requests.length, 1)
  const request = host.requests[0]
  assert.equal(request.url, 'https://www.apophis.uk/v1/responses')
  const assistant = request.body.input.filter(item => item.role === 'assistant')
  assert.ok(assistant.some(item => item.content.some(block => block.type === 'output_text' && block.text === '旧 Chat 思考。')))
  assert.ok(assistant.some(item => item.content.some(block => block.type === 'output_text' && block.text === '旧 Chat 回答。')))
  assert.equal(request.body.input.some(item => item.type === 'reasoning'), false)
})
