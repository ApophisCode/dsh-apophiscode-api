import assert from 'node:assert/strict'
import test from 'node:test'

import { createUserMessage } from '@deepseek-ai/dsh-llm'

import { createVisionFixture } from '../scripts/vision-fixture.mjs'
import { nativeStream, TEXT_SIGNATURE, TOOL_SIGNATURE } from './fixtures/gemini.mjs'
import { ApophisCodeKeyRing } from '../src/key-ring.js'
import { createApophisCodeProvider } from '../src/provider.js'
import { createRouteAdapter } from '../src/route.js'
import { fakeCredentials, hostProvider } from './helpers.mjs'

const KEY = 'sk-fixture-only-not-a-real-key'
const user = { role: 'user', content: 'Reply with ok', timestamp: 1 }

function capture(t, respond = (_request, _count, model) => nativeStream(undefined, model)) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    const call = { url: new URL(request.url), key: request.headers.get('x-goog-api-key'), body: await request.json() }
    requests.push(call)
    return respond(call, requests.length, call.url.pathname.match(/\/models\/([^:]+)/u)[1])
  })
  return requests
}

for (const id of ['gemini-4-argon', 'gemini-3.8-flash']) {
  test(`${id} streams its three thinking levels through the native SDK without thinkingBudget`, async t => {
    const requests = capture(t)
    const provider = hostProvider(createApophisCodeProvider())
    const model = provider.getModels().find(model => model.id === id)
    for (const reasoning of ['low', 'medium', 'high']) {
      const stream = provider.streamSimple(model, { systemPrompt: 'Be concise.', messages: [user] }, {
        apiKey: KEY, reasoning, maxTokens: 2048,
      })
      const events = []
      for await (const event of stream) events.push(event)
      const result = await stream.result()
      assert.equal(result.stopReason, 'stop', result.errorMessage)
      assert.equal(result.api, 'google-generative-ai')
      assert.equal(events.filter(event => event.type === 'text_delta').map(event => event.delta).join(''), 'ok')
      assert.equal(events.filter(event => event.type === 'thinking_delta').map(event => event.delta).join(''), 'Checked.')
      assert.equal(result.content.find(block => block.type === 'text').textSignature, TEXT_SIGNATURE)
      assert.equal(result.usage.input, 10)
      assert.equal(result.usage.output, 6, 'thinking tokens count toward output')
      const { url, key, body } = requests.at(-1)
      assert.equal(url.origin, 'https://www.apophis.uk')
      assert.equal(url.pathname, `/v1beta/models/${id}:streamGenerateContent`)
      assert.equal(url.searchParams.get('alt'), 'sse')
      assert.equal(url.searchParams.has('key'), false, 'credentials stay out of URLs')
      assert.equal(key, KEY)
      assert.deepEqual(body.generationConfig.thinkingConfig, { includeThoughts: true, thinkingLevel: reasoning.toUpperCase() })
      assert.equal(body.generationConfig.maxOutputTokens, 2048)
      assert.equal(body.systemInstruction.parts[0].text, 'Be concise.')
      assert.equal(body.reasoning_effort, undefined)
      assert.equal(body.messages, undefined)
    }
    assert.equal(requests.length, 3)
  })

  test(`${id} defaults to medium and preserves an async payload hook after level normalization`, async t => {
    const requests = capture(t)
    const provider = hostProvider(createApophisCodeProvider())
    const model = provider.getModels().find(model => model.id === id)
    let callbacks = 0
    const result = await provider.streamSimple(model, { messages: [user] }, {
      apiKey: KEY,
      onPayload: async (payload, descriptor) => {
        callbacks += 1
        assert.equal(descriptor.id, model.id)
        assert.equal(payload.config.thinkingConfig.thinkingLevel, 'MEDIUM')
        assert.equal(payload.config.thinkingConfig.thinkingBudget, undefined)
        return { ...payload, config: { ...payload.config, maxOutputTokens: 512 } }
      },
    }).result()
    assert.equal(result.stopReason, 'stop', result.errorMessage)
    assert.equal(callbacks, 1)
    assert.equal(requests[0].body.generationConfig.maxOutputTokens, 512)
  })

  test(`${id} images reach the native endpoint through the registered host route`, async t => {
    const requests = capture(t, (_request, _count, model) => nativeStream([{ text: 'red' }], model))
    const image = createVisionFixture('red')
    const ring = new ApophisCodeKeyRing(fakeCredentials())
    await ring.add(KEY, 'fixture')
    const adapter = createRouteAdapter({
      ring, resolveAttachments: () => image.attachments,
      keys: { active: () => ring.activeKey(), forRequest: (_model, key) => key, onKeyFailure: () => assert.fail('the fixture key must not be rejected') },
    })
    const prepared = await adapter.prepareCall('apophiscode', id)
    const chunks = []
    for await (const chunk of prepared.stream({
      provider: 'apophiscode', model: id, reasoningEffort: 'high', maxTokens: 2048,
      messages: [createUserMessage({ content: [{ type: 'text', text: 'Describe this image.' }, image.block], source: { kind: 'user' } })],
    })) chunks.push(chunk)
    assert.equal(chunks.find(chunk => chunk.type === 'finish')?.reason.kind, 'stop')
    assert.equal(chunks.filter(chunk => chunk.type === 'text-delta').map(chunk => chunk.text).join(''), 'red')
    assert.deepEqual(image.reads, [image.block.attachment.attachmentId])
    const pixels = requests[0].body.contents.flatMap(message => message.parts).filter(part => part.inlineData)
    assert.deepEqual(pixels, [{ inlineData: { mimeType: 'image/png', data: image.data.toString('base64') } }])
    assert.equal(requests[0].body.generationConfig.thinkingConfig.thinkingLevel, 'HIGH')
    assert.equal(requests[0].key, KEY)
  })

  test(`${id} replays native tool calls with their original signature and their tool results`, async t => {
    const requests = capture(t, (_request, count, model) => count === 1
      ? nativeStream([{ functionCall: { name: 'echo', args: { text: 'ok' } }, thoughtSignature: TOOL_SIGNATURE }], model)
      : nativeStream([{ text: 'ok' }], model))
    const provider = hostProvider(createApophisCodeProvider())
    const model = provider.getModels().find(model => model.id === id)
    const tools = [{ name: 'echo', description: 'Echo a message.', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }]
    const options = { apiKey: KEY, reasoning: 'low' }
    const first = await provider.streamSimple(model, { messages: [user], tools }, options).result()
    assert.equal(first.stopReason, 'toolUse', first.errorMessage)
    const call = first.content.find(block => block.type === 'toolCall')
    assert.equal(call.name, 'echo')
    assert.equal(call.thoughtSignature, TOOL_SIGNATURE)
    const second = await provider.streamSimple(model, {
      tools,
      messages: [user, first, { role: 'toolResult', toolCallId: call.id, toolName: call.name, content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 2 }],
    }, options).result()
    assert.equal(second.stopReason, 'stop', second.errorMessage)
    assert.equal(requests[0].body.tools[0].functionDeclarations[0].name, 'echo')
    const replayed = requests[1].body.contents.flatMap(message => message.parts)
    assert.equal(replayed.find(part => part.functionCall).thoughtSignature, TOOL_SIGNATURE)
    assert.equal(replayed.find(part => part.functionResponse).functionResponse.name, 'echo')
    assert.equal(second.api, 'google-generative-ai')
    const direct = await provider.stream(model, {
      tools,
      messages: [user, first, { role: 'toolResult', toolCallId: call.id, toolName: call.name, content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 2 }],
    }, { apiKey: KEY }).result()
    assert.equal(direct.stopReason, 'stop', direct.errorMessage)
    assert.equal(requests[2].body.contents.flatMap(message => message.parts).find(part => part.functionCall).thoughtSignature, TOOL_SIGNATURE, 'the direct stream path preserves it too')
  })

  test(`${id} does not replay foreign or invalid signatures or synthesize a skip signature`, async t => {
    const requests = capture(t, (_request, count, model) => count === 1
      ? nativeStream([{ functionCall: { id: 'history_echo', name: 'echo', args: { text: 'ok' } }, thoughtSignature: TOOL_SIGNATURE }], model)
      : nativeStream(undefined, model))
    const provider = hostProvider(createApophisCodeProvider())
    const model = provider.getModels().find(model => model.id === id)
    const first = await provider.streamSimple(model, { messages: [user] }, { apiKey: KEY }).result()
    assert.equal(first.stopReason, 'toolUse', first.errorMessage)
    for (const [sourceModel, sourceProvider, signature] of [
      ['another-model', 'apophiscode', TOOL_SIGNATURE],
      [id, 'another-provider', TOOL_SIGNATURE],
      [id, 'apophiscode', 'not-base64'],
      [id, 'apophiscode', undefined],
    ]) {
      const previous = { ...first, model: sourceModel, provider: sourceProvider,
        content: [{ type: 'text', text: 'History.', textSignature: signature },
          { type: 'toolCall', id: 'history_echo', name: 'echo', arguments: { text: 'ok' }, thoughtSignature: signature }],
        stopReason: 'toolUse', timestamp: 1 }
      const history = { messages: [user, previous, { role: 'toolResult', toolCallId: 'history_echo', toolName: 'echo',
        content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 2 }] }
      const before = JSON.stringify(history)
      const result = await provider.streamSimple(model, history, { apiKey: KEY }).result()
      assert.equal(result.stopReason, 'stop', result.errorMessage)
      const parts = requests.at(-1).body.contents.flatMap(message => message.parts)
      assert.ok(parts.some(part => part.functionCall))
      assert.ok(parts.every(part => part.thoughtSignature === undefined))
      assert.equal(JSON.stringify(history), before, 'SDK history conversion does not mutate the stored messages')
    }
  })
}
