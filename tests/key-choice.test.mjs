import assert from 'node:assert/strict'
import test from 'node:test'

import { createUserMessage } from '@deepseek-ai/dsh-llm'

import { APOPHISCODE_MODEL_IDS } from '../src/catalog.js'
import { apply } from '../src/index.js'
import { fakeCredentials } from './helpers.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'
import { eventStream, responseFrames } from './fixtures/openai.mjs'

const KEY_CODEX = 'sk-codex-only-key-AAAA'
const KEY_DEEPSEEK = 'sk-deepseek-key-BBBB'
const KEY_CLAUDE = 'sk-claude-code-key-CCCC'
const MODELS = { [KEY_CODEX]: ['gpt-6.1-sol'], [KEY_DEEPSEEK]: ['deepseek-v4.1-flash'], [KEY_CLAUDE]: ['claude-opus-5-5', 'claude-haiku-5-5'] }
const PLAZA = { code: 0, data: { groups: [
  { id: 1, name: 'codex - 福利分组', models: [{ name: 'gpt-6.1-sol' }] },
  { id: 2, name: 'claude - 满血Max', models: [{ name: 'claude-opus-5-5' }] },
] } }

/**
 * A stand-in ApophisCode gateway on `fetch`: the read-only model list,
 * public directory, and a Responses stream that records the key it was sent.
 */
function fakeGateway() {
  const chatKeys = []
  const probes = []
  const original = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    const headers = new Headers(init.headers ?? (typeof input === 'string' ? undefined : input.headers))
    const key = headers.get('authorization')?.replace(/^Bearer /u, '')
    if (new URL(url).pathname === '/v1/messages') {
      const body = JSON.parse(init.body)
      chatKeys.push(key)
      return anthropicStream(body.model)
    }
    if (url.endsWith('/api/v1/model-plaza')) return Response.json(PLAZA)
    if (url.endsWith('/v1/models')) { probes.push(key); return Response.json({ data: (MODELS[key] ?? []).map(id => ({ id })) }) }
    if (url.endsWith('/v1/responses')) {
      const body = JSON.parse(typeof init.body === 'string' ? init.body : await new Response(init.body).text())
      chatKeys.push(key)
      return eventStream(responseFrames(body.model, { textParts: ['ok'] }))
    }
    return new Response('{}', { status: 404 })
  }
  return { chatKeys, probes, restore: () => { globalThis.fetch = original } }
}

function context() {
  const seen = {}
  const ctx = {
    credentials: fakeCredentials(),
    logger: { warn: () => {}, info: () => {} },
    llm: {
      registerAdapter: (_providers, adapter) => { seen.adapter = adapter; return () => {} },
      registerConfigurableProviders: () => () => {},
    },
    get: () => undefined,
    inject(names, callback) {
      if (names.includes('connection')) return callback({ effect: ctx.effect, connection: { rpc: { handle: (_c, handler) => { seen.handler = handler; return () => {} } } } })
      if (names.includes('tools')) return callback({ tools: { register: () => () => {} } })
      return undefined
    },
    effect(callback) {
      const disposer = callback()
      return typeof disposer === 'function' ? disposer : () => {}
    },
  }
  return { ctx, seen }
}

const turn = async (adapter, model) => {
  const prepared = await adapter.prepareCall('apophiscode', model)
  const chunks = []
  for await (const chunk of prepared.stream({
    provider: 'apophiscode',
    model,
    sessionId: 'session-1',
    reasoningEffort: 'high',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })],
  })) chunks.push(chunk)
  return chunks
}

test('an HTTP turn runs on a key whose model list includes its model, without moving the active key', async t => {
  const gateway = fakeGateway()
  t.after(gateway.restore)
  const { ctx, seen } = context()
  apply(ctx, {})
  await seen.handler('keys/add', { key: KEY_CODEX, label: 'codex' })
  await seen.handler('keys/add', { key: KEY_DEEPSEEK, label: 'deepseek' })

  const chunks = await turn(seen.adapter, 'deepseek-v4.1-flash')
  assert.equal(chunks.at(-1).type, 'finish')
  assert.equal(chunks.at(-1).reason.kind, 'stop')
  // The active key (codex) has no DeepSeek group; the DeepSeek key served it.
  assert.deepEqual(gateway.chatKeys, [KEY_DEEPSEEK])
  const status = await seen.handler('status', {})
  assert.equal(status.value.keys.find(key => key.active).label, 'codex')

  // The panel never derives current-key membership from the public directory.
  const groups = await seen.handler('groups', {})
  assert.equal(groups.ok, true)
  assert.deepEqual(groups.value.keys.map(key => key.groups), [undefined, undefined])
  assert.equal(groups.value.keys[0].coverage['gpt-6.1-sol'], true)
  assert.equal(groups.value.keys[1].coverage['deepseek-v4.1-flash'], true)
  assert.doesNotMatch(JSON.stringify(groups), /sk-(codex|deepseek)/u)
})

test('listing models reads only the active plugin key; request key choice still uses verified coverage', async t => {
  const gateway = fakeGateway()
  t.after(gateway.restore)
  const { ctx, seen } = context()
  apply(ctx, {})
  await seen.handler('keys/add', { key: KEY_CODEX, label: 'codex' })
  await seen.handler('keys/add', { key: KEY_DEEPSEEK, label: 'deepseek' })

  // DSH 0.2.1 resolves a key before it lists the route's models.
  assert.deepEqual((await seen.adapter.listModels('apophiscode')).map(model => model.id), ['gpt-6.1-sol'])
  assert.deepEqual(gateway.probes, [KEY_CODEX])

  const chunks = await turn(seen.adapter, 'deepseek-v4.1-flash')
  assert.equal(chunks.at(-1).reason.kind, 'stop')
  assert.deepEqual(gateway.chatKeys, [KEY_DEEPSEEK])
  assert.deepEqual(gateway.probes.toSorted(), [KEY_CODEX, KEY_DEEPSEEK].toSorted())
})

test('a native Claude turn after "use this key" uses that key, otherwise one with Claude coverage', async t => {
  const gateway = fakeGateway()
  t.after(gateway.restore)
  const { ctx, seen } = context()
  // Key choice is transport-independent; pin HTTP so the cc key's Claude
  // turns reach this fake gateway instead of a Claude Code CLI.
  apply(ctx, { claudeTransport: 'http' })
  await seen.handler('keys/add', { key: KEY_CODEX, label: 'codex' })
  await seen.handler('keys/add', { key: KEY_CLAUDE, label: 'claude' })

  // Active key without Claude coverage: the native bearer uses the cc key.
  const passedOver = await turn(seen.adapter, 'claude-opus-5-5')
  assert.equal(passedOver.at(-1).reason.kind, 'stop')
  assert.deepEqual(gateway.chatKeys, [KEY_CLAUDE])

  // "Use this key" on the cc key: the very next run uses it, named plainly.
  const status = await seen.handler('status', {})
  await seen.handler('keys/select', { id: status.value.keys.find(key => key.label === 'claude').id })
  const selected = await turn(seen.adapter, 'claude-opus-5-5')
  assert.equal(selected.at(-1).reason.kind, 'stop')

  assert.deepEqual(gateway.chatKeys, [KEY_CLAUDE, KEY_CLAUDE])
})

test('failed model discovery stays unknown and does not stop an active-key HTTP turn', async t => {
  const original = globalThis.fetch
  const seenKeys = []
  globalThis.fetch = async (input, init = {}) => {
    const request = new Request(input, init)
    if (new URL(request.url).pathname === '/v1/models') return Response.json({ unexpected: true })
    if (new URL(request.url).pathname === '/api/v1/model-plaza') return new Response('unavailable', { status: 404 })
    assert.equal(new URL(request.url).pathname, '/v1/messages')
    seenKeys.push(request.headers.get('authorization'))
    return anthropicStream((await request.json()).model)
  }
  t.after(() => { globalThis.fetch = original })
  const { ctx, seen } = context()
  apply(ctx, {})
  await seen.handler('keys/add', { key: KEY_CLAUDE, label: 'claude' })
  const groups = await seen.handler('groups', {})
  assert.deepEqual(groups.value.keys[0].coverage, {})
  assert.match(groups.value.keys[0].error, /unrecognized/u)
  assert.equal((await turn(seen.adapter, 'claude-opus-5-5')).at(-1).reason.kind, 'stop')
  assert.deepEqual(seenKeys, [`Bearer ${KEY_CLAUDE}`])
})
