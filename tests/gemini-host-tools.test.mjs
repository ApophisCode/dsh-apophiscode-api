import assert from 'node:assert/strict'
import test from 'node:test'
import { createToolResultMessage } from '@deepseek-ai/dsh-llm'

import { nativeFrame, nativeFrames, nativeStream, TEXT_SIGNATURE, TOOL_SIGNATURE } from './fixtures/gemini.mjs'
import { createPluginHost, PLUGIN_TEST_KEY, textOf, userMessage } from './plugin-host-fixture.mjs'

const MODELS = ['gemini-4-argon', 'gemini-3.8-flash']
const partsOf = body => body.contents.flatMap(message => message.parts)
const storedHistory = (first, model, call, toolResult) => JSON.parse(JSON.stringify([
  userMessage('读取内存后回答。'),
  first.message({ kind: 'model', provider: 'apophiscode', model, replayState: first.replayState }),
  createToolResultMessage({ callId: call.id, content: toolResult.content, isError: toolResult.isError }),
]))

for (const model of MODELS) {
  test(`${model} uses the registered plugin and ToolRuntime for signed native tool history and Chinese streaming`, async t => {
    const host = await createPluginHost(t, {
      config: { apiHost: 'https://gateway.example/proxy/v1beta' },
      respond: ({ body, index }) => index === 1
        ? nativeFrames([
          [{ text: '先查内存。', thought: true }],
          [{ text: '正在查询。', thoughtSignature: TEXT_SIGNATURE }],
          [{ functionCall: { id: 'call_native_memory', name: body.tools[0].functionDeclarations[0].name, args: { query: '中文🔎' } }, thoughtSignature: TOOL_SIGNATURE }],
        ], model)
        : nativeFrames([[{ text: '内存' }], [{ text: '读取完成：中文🔎。' }]], model),
    })
    const result = await host.toolRoundTrip({ model, reasoningEffort: 'high', expectedArguments: { query: '中文🔎' } })
    assert.equal(result.call.id, 'call_native_memory')
    assert.equal(host.executions[0].callId, result.call.id)
    assert.equal(result.executed, 1)
    assert.equal(textOf(result.second), '内存读取完成：中文🔎。')
    assert.ok(result.secondChunks.filter(chunk => chunk.type === 'text-delta').length >= 2)
    assert.equal(result.firstChunks.filter(chunk => chunk.type === 'reasoning-delta').map(chunk => chunk.text).join(''), '先查内存。')
    assert.ok(JSON.stringify(result.first.replayState).includes(TOOL_SIGNATURE))
    const [first, second] = result.requests
    for (const call of result.requests) {
      const url = new URL(call.url)
      assert.equal(url.origin, 'https://gateway.example')
      assert.equal(url.pathname, `/proxy/v1beta/models/${model}:streamGenerateContent`)
      assert.equal(url.searchParams.get('alt'), 'sse')
      assert.equal(url.searchParams.has('key'), false)
      assert.equal(call.headers.get('x-goog-api-key'), PLUGIN_TEST_KEY)
      assert.deepEqual(call.body.generationConfig.thinkingConfig, { includeThoughts: true, thinkingLevel: 'HIGH' })
    }
    assert.equal(partsOf(first.body).some(part => part.functionResponse), false)
    const replay = partsOf(second.body)
    assert.equal(replay.find(part => part.functionCall).thoughtSignature, TOOL_SIGNATURE)
    assert.equal(replay.find(part => part.functionCall).functionCall.id, result.call.id)
    assert.equal(replay.find(part => part.text === '正在查询。').thoughtSignature, TEXT_SIGNATURE)
    assert.deepEqual(replay.find(part => part.functionResponse).functionResponse, {
      id: result.call.id, name: result.call.name, response: { output: '内存记录：中文🔎' },
    })
    assert.equal(JSON.stringify(second.body).includes('skip_thought_signature_validator'), false)
  })

  test(`${model} cancellation preserves received text and allows a later request`, async t => {
    const abort = new AbortController()
    let abortedRequest = false
    const host = await createPluginHost(t, { respond: ({ request, index }) => {
      if (index > 1) return nativeFrames([[{ text: '恢复' }], [{ text: '成功。' }]], model)
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(nativeFrame([{ text: '收到中文' }], model)))
        request.signal.addEventListener('abort', () => {
          abortedRequest = true
          controller.error(new DOMException('Fixture aborted', 'AbortError'))
        }, { once: true })
      } }), { headers: { 'Content-Type': 'text/event-stream' } })
    } })
    const first = await host.turn({ model, signal: abort.signal, onChunk: chunk => {
      if (chunk.type === 'text-delta') abort.abort()
    } })
    assert.equal(abortedRequest, true)
    assert.equal(textOf(first.assembled), '收到中文')
    assert.equal(first.assembled.finish?.kind, 'aborted')
    const next = await host.turn({ model })
    assert.equal(next.assembled.finish?.kind, 'stop')
    assert.equal(textOf(next.assembled), '恢复成功。')
    assert.equal(host.requests.length, 2)
    assert.equal(host.executions.length, 0)
  })

  test(`${model} exposes a signed continuation refusal without a hidden resend or key change`, async t => {
    const host = await createPluginHost(t, { respond: ({ body, index }) => index === 1
      ? nativeStream([{ functionCall: { id: 'call_refused', name: body.tools[0].functionDeclarations[0].name, args: { query: '中文🔎' } }, thoughtSignature: TOOL_SIGNATURE }], model)
      : Response.json({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Invalid thought signature.' } }, { status: 400 }),
    })
    const { assembled } = await host.turn({ model })
    const call = assembled.blocks().find(block => block.type === 'tool-call')
    assert.ok(call)
    const toolResult = await host.runtime.execute({ callId: call.id, name: call.name, arguments: JSON.parse(call.arguments),
      agent: host.agent, signal: new AbortController().signal })
    assert.equal(toolResult.isError, false)
    const failed = await host.turn({ model, messages: storedHistory(assembled, model, call, toolResult) })
    assert.equal(failed.assembled.finish?.kind, 'error')
    assert.match(failed.assembled.finish.failure.message, /Invalid thought signature/u)
    assert.equal(host.requests.length, 2)
    assert.equal(partsOf(host.requests[1].body).find(part => part.functionCall).thoughtSignature, TOOL_SIGNATURE)
    const status = await host.rpc('status')
    assert.equal(status.ok, true)
    assert.equal(status.value.keys[0].disabled, false)
    assert.equal(host.executions.length, 1, 'a refused continuation does not execute the tool again')
  })

  test(`${model} exposes HTTP authentication errors and redacts an echoed plugin key`, async t => {
    const host = await createPluginHost(t, { respond: () => Response.json({ error: {
      code: 401, status: 'UNAUTHENTICATED', message: `API key invalid: ${PLUGIN_TEST_KEY}`,
    } }, { status: 401 }) })
    const { assembled } = await host.turn({ model })
    assert.equal(assembled.finish?.kind, 'error')
    assert.equal(JSON.stringify(assembled.finish).includes(PLUGIN_TEST_KEY), false)
    assert.match(assembled.finish.failure.message, /(?:key|密钥)/iu)
    assert.equal(host.requests.length, 1)
    assert.equal(host.executions.length, 0)
  })

  test(`${model} leaves an unoffered native call to the real ToolRuntime's rejection`, async t => {
    const host = await createPluginHost(t, { respond: () => nativeStream([
      { functionCall: { id: 'call_unoffered', name: 'unoffered_tool', args: { query: '中文🔎' } }, thoughtSignature: TOOL_SIGNATURE },
    ], model) })
    const { assembled } = await host.turn({ model })
    const call = assembled.blocks().find(block => block.type === 'tool-call')
    assert.ok(call)
    assert.equal(call.name, 'unoffered_tool')
    const result = await host.runtime.execute({ callId: call.id, name: call.name, arguments: JSON.parse(call.arguments),
      agent: host.agent, signal: new AbortController().signal })
    assert.equal(result.isError, true)
    assert.match(JSON.stringify(result), /UNKNOWN_TOOL|unknown tool/u)
    assert.equal(host.executions.length, 0)
    assert.equal(host.requests.length, 1)
  })

  test(`${model} exposes a mid-stream protocol failure with partial Chinese text and no tool execution`, async t => {
    const host = await createPluginHost(t, { respond: () => new Response(new ReadableStream({ start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(nativeFrame([{ text: '部分回答。' }], model)))
      // The Google SDK accepts raw JSON error chunks in an interrupted SSE stream.
      controller.enqueue(encoder.encode(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Fixture stream rejected' } })))
      controller.close()
    } }), { headers: { 'Content-Type': 'text/event-stream' } }) })
    const { assembled } = await host.turn({ model })
    assert.equal(textOf(assembled), '部分回答。')
    assert.equal(assembled.finish?.kind, 'error')
    assert.match(assembled.finish.failure.message, /Fixture stream rejected/u)
    assert.equal(host.requests.length, 1)
    assert.equal(host.executions.length, 0)
  })

  test(`${model} preserves an SSE-wrapped error before native response projection`, async t => {
    const bytes = `${nativeFrame([{ text: '部分回答。' }], model)}data: {"error":{"code":400,"message":"Fixture stream rejected"}}\n\n`
    const host = await createPluginHost(t, { respond: () => new Response(bytes, { headers: { 'Content-Type': 'text/event-stream' } }) })
    const { assembled } = await host.turn({ model })
    assert.equal(textOf(assembled), '部分回答。')
    assert.equal(assembled.finish?.kind, 'error')
    assert.match(assembled.finish.failure.message, /400.*Fixture stream rejected/u)
    assert.equal(host.requests.length, 1)
    assert.equal(host.executions.length, 0)
  })
}
