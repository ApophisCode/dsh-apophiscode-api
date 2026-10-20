import assert from 'node:assert/strict'
import test from 'node:test'

import { createUserMessage } from '@deepseek-ai/dsh-llm'

import { createVisionFixture } from '../scripts/vision-fixture.mjs'
import { ApophisCodeKeyRing } from '../src/key-ring.js'
import { createRouteAdapter } from './fixtures/declared-gateway.mjs'
import { fakeCredentials } from './helpers.mjs'
import { eventStream, responseFrames } from './fixtures/openai.mjs'

test('DeepSeek images reach Responses through the registered host route', async t => {
  const fixture = createVisionFixture('red')
  const ring = new ApophisCodeKeyRing(fakeCredentials())
  await ring.add('sk-fixture-only-not-a-real-key', 'fixture')
  const adapter = createRouteAdapter({
    ring,
    keys: {
      active: () => ring.activeKey(),
      forRequest: (_model, key) => key,
      onKeyFailure: () => assert.fail('the fixture key must not be rejected'),
    },
    fallbackSessionId: 'vision-fixture',
    resolveAttachments: () => fixture.attachments,
  })
  const requests = []
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    requests.push({ url: request.url, body: await request.json() })
    return eventStream(responseFrames('deepseek-v4.1-flash', { textParts: ['red'] }))
  })
  const prepared = await adapter.prepareCall('apophiscode', 'deepseek-v4.1-flash')
  const chunks = []
  for await (const chunk of prepared.stream({
    provider: 'apophiscode', model: 'deepseek-v4.1-flash', sessionId: 'vision-fixture',
    reasoningEffort: 'off', maxTokens: 128,
    messages: [createUserMessage({
      content: [{ type: 'text', text: 'Describe this image.' }, fixture.block],
      source: { kind: 'user' },
    })],
  })) chunks.push(chunk)

  assert.equal(chunks.find(chunk => chunk.type === 'finish')?.reason.kind, 'stop')
  assert.equal(chunks.filter(chunk => chunk.type === 'text-delta').map(chunk => chunk.text).join(''), 'red')
  assert.deepEqual(fixture.reads, [fixture.block.attachment.attachmentId])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://www.apophis.uk/v1/responses')
  assert.equal(requests[0].body.model, 'deepseek-v4.1-flash')
  assert.deepEqual(requests[0].body.reasoning, { effort: 'none' })
  const content = requests[0].body.input.find(message => message.role === 'user').content
  assert.deepEqual(content[0], { type: 'input_text', text: 'Describe this image.' })
  // The host also adds a text description of the request preview. What
  // matters here is that it preserves the pixels rather than only that text.
  assert.deepEqual(content.filter(block => block.type === 'input_image'), [
    { type: 'input_image', detail: 'auto', image_url: `data:image/png;base64,${fixture.data.toString('base64')}` },
  ])
})
