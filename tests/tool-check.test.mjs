import assert from 'node:assert/strict'
import test from 'node:test'

import { createApophisCodeCatalog } from '../src/catalog.js'
import { createToolCheck, main, parseToolCheckArgs } from '../scripts/tool-check.mjs'
import { chatFrames, eventStream, responseFrames } from './fixtures/openai.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'

const KEY = 'sk-tool-check-offline-fixture'
const APOPHISCODE_MODELS = createApophisCodeCatalog(undefined, { includeLegacy: true })

test('help and every invalid option return before reading a stored key or creating a check', async () => {
  let reads = 0, checks = 0
  const deps = { readKey: async () => { reads += 1; throw new Error('must not read a key') },
    createCheck: async () => { checks += 1; throw new Error('must not create a check') }, write() {} }
  assert.equal(await main(['--help'], deps), 0)
  for (const args of [[], ['--model'], ['--model', 'unknown'], ['--model', 'gpt-6.1-sol', '--reasoning', 'off'],
    ['--model', 'gpt-6.1-sol', '--unknown', 'x'], ['--model', 'gpt-6.1-sol', '--model', 'grok-4.7'],
    ['--model', 'deepseek-v4.1-flash', '--api-host', 'file:///tmp'], ['--model', 'deepseek-v4.1-flash', '--api-host', 'https://user:password@gateway.example'],
    ['--model', 'deepseek-v4.1-flash', '--api-host', 'https://gateway.example?key=secret'],
    ['--model', 'deepseek-v4.1-flash', '--timeout-ms', '1'], ['--model', 'deepseek-v4.1-flash', '--timeout-ms', 'NaN'],
    ['--model', 'deepseek-v4.1-flash', '--key-label'], ['--help', '--model', 'deepseek-v4.1-flash']]) {
    assert.equal(await main(args, deps), 1)
  }
  assert.equal(reads, 0)
  assert.equal(checks, 0)
})

test('argument parsing accepts every exact catalog ID and only supported model efforts', () => {
  for (const model of APOPHISCODE_MODELS) {
    const parsed = parseToolCheckArgs(['--model', model.id])
    assert.equal(parsed.model, model.id)
    assert.equal(parsed.reasoning, model.id === 'deepseek-v4-pro' ? 'high' : 'low')
    assert.equal(parsed.timeoutMs, 65000)
    assert.equal(parsed.apiHost, 'https://www.apophis.uk')
  }
  assert.equal(parseToolCheckArgs(['--model', 'deepseek-v4.1-flash', '--reasoning', 'off']).reasoning, 'off')
})

/** Locate the actual native tool output in each SDK's encoded continuation. */
function returnedValue(value) {
  if (typeof value === 'string') {
    try { return returnedValue(JSON.parse(value)) } catch { return undefined }
  }
  if (value === null || typeof value !== 'object') return undefined
  if (typeof value.value === 'string' && value.value.startsWith('校验值-')) return value.value
  for (const entry of Object.values(value)) {
    const found = returnedValue(entry)
    if (found !== undefined) return found
  }
}

function promptText(body) {
  if (body.messages !== undefined) return body.messages.flatMap(message => typeof message.content === 'string'
    ? [message.content] : message.content.map(block => block.text ?? '')).join('\n')
  if (body.input !== undefined) return body.input.flatMap(message => typeof message.content === 'string'
    ? [message.content] : (message.content ?? []).map(block => block.text ?? '')).join('\n')
  return body.contents.flatMap(content => content.parts.map(part => part.text ?? '')).join('\n')
}

for (const model of APOPHISCODE_MODELS) {
  test(`the generic live-check composition supports ${model.id} through the built registered adapter and real ToolRuntime`, async t => {
    const requests = []
    t.mock.method(globalThis, 'fetch', async (input, init) => {
      const request = new Request(input, init), body = await request.json()
      requests.push({ request, body })
      const first = requests.length === 1
      const args = first ? { id: JSON.parse(promptText(body).match(/查询 id 为 ("[^"]+")/u)[1]) } : undefined
      const value = first ? undefined : returnedValue(body)
      if (!first) assert.ok(value, 'the second request carries the value produced by the real native tool')
      const textParts = first ? undefined : [`读取结果：${value}`]
      if (model.api === 'openai-completions') return eventStream(chatFrames(model.id, first
        ? { tool: { id: 'call_check', name: body.tools[0].function.name, argumentsParts: [JSON.stringify(args)] } } : { textParts }))
      if (model.api === 'openai-responses') return eventStream(responseFrames(model.id, first
        ? { tool: { id: 'call_check', name: body.tools[0].name, argumentsParts: [JSON.stringify(args)] } } : { textParts }))
      if (model.api === 'anthropic-messages') return anthropicStream(model.id, first
        ? { type: 'tool_use', id: 'call_check', name: body.tools[0].name, input: args } : { type: 'text', text: textParts.join('') })
      return eventStream([{ candidates: [{ content: { role: 'model', parts: first
        ? [{ functionCall: { id: 'call_check', name: body.tools[0].functionDeclarations[0].name, args },
          thoughtSignature: Buffer.from('tool-check offline signature fixture').toString('base64') }]
        : [{ text: textParts.join('') }] }, finishReason: 'STOP', index: 0 }],
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 2, totalTokenCount: 10 }, modelVersion: model.id }])
    })
    const check = await createToolCheck({ key: KEY, apiHost: 'https://gateway.example/prefix', timeoutMs: 1000 })
    t.after(check.close)
    const result = await check.run({ model: model.id })
    assert.equal(result.ok, true, JSON.stringify(result))
    assert.equal(result.executions, 1)
    assert.equal(result.modelTurns, 2)
    assert.equal(result.firstFinish, 'tool-calls')
    assert.equal(result.secondFinish, 'stop')
    assert.equal(result.valueMatched, true)
    assert.equal(requests.length, 2)
    assert.ok(requests.every(call => new URL(call.request.url).origin === 'https://gateway.example'))
    assert.equal(JSON.stringify(result).includes(KEY), false)
  })
}

test('the command reports failed checks accurately, closes its resources and redacts reflected credentials', async () => {
  const output = [], reads = [], created = []
  let closed = 0
  const exit = await main(['--model', 'gpt-6.1-sol', '--key-label', 'selected'], {
    readKey: async options => { reads.push(options); return KEY },
    createCheck: async options => { created.push(options); return {
      run: async () => ({ ok: false, failure: { message: `upstream echoed ${KEY}` } }), close: async () => { closed += 1 },
    } },
    write: text => output.push(text),
  })
  assert.equal(exit, 1)
  assert.deepEqual(reads, [{ label: 'selected' }])
  assert.equal(created[0].key, KEY)
  assert.equal(output.join('').includes(KEY), false)
  assert.ok(output.join('').includes('[redacted]'))
  assert.equal(closed, 1)
})

test('cleanup failures are reported with a failing exit code and no reflected credential', async () => {
  const output = []
  const exit = await main(['--model', 'deepseek-v4.1-flash'], {
    readKey: async () => KEY,
    createCheck: async () => ({ run: async () => ({ ok: true }), close: async () => { throw new Error(`cleanup failed ${KEY}`) } }),
    write: text => output.push(text),
  })
  assert.equal(exit, 1)
  assert.equal(output.join('').includes(KEY), false)
  assert.equal(JSON.parse(output.at(-1)).failure.code, 'TOOL_CHECK_CLEANUP')
})
