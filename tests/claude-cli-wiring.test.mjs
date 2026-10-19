import assert from 'node:assert/strict'
import { chmod, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'

import { apply } from '../src/index.js'
import { fakeCredentials } from './helpers.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'

const FAKE_CLI = fileURLToPath(new URL('./fixtures/fake-claude-cli.mjs', import.meta.url))
const CC_KEY = 'sk-wiring-cc-key-AAAA'
const SALE_KEY = 'sk-wiring-cc-sale-key-BBBB'
const CLAUDE = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']

/** The ApophisCode gateway's account reads, and an HTTP Messages endpoint that records the key. */
function fakeGateway(t) {
  const httpKeys = []
  t.mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const key = request.headers.get('authorization')?.replace(/^Bearer /u, '')
    if (url.pathname === '/api/v1/model-plaza') return Response.json({ code: 0, data: { groups: [{ id: 1, name: 'claude - 满血Max', models: CLAUDE.map(name => ({ name })) }] } })
    if (url.pathname === '/v1/models') return Response.json({ data: CLAUDE.map(id => ({ id })) })
    if (url.pathname === '/v1/messages') {
      const body = await request.json()
      httpKeys.push(key)
      return anthropicStream(body.model, { type: 'text', text: 'via http' })
    }
    return new Response('{}', { status: 404 })
  })
  return httpKeys
}

function context() {
  const seen = { disposers: [] }
  const ctx = {
    credentials: fakeCredentials(),
    logger: { warn: () => {}, info: () => {} },
    llm: { registerAdapter: (_providers, adapter) => { seen.adapter = adapter; return () => {} }, registerConfigurableProviders: () => () => {} },
    get: () => undefined,
    inject(names, callback) {
      if (names.includes('connection')) return callback({ effect: ctx.effect, connection: { rpc: { handle: (_c, handler) => { seen.handler = handler; return () => {} } } } })
      return undefined
    },
    effect(callback) {
      const disposer = callback()
      if (typeof disposer === 'function') seen.disposers.push(disposer)
      return typeof disposer === 'function' ? disposer : () => {}
    },
  }
  return { ctx, seen }
}

async function turn(adapter, model) {
  const prepared = await adapter.prepareCall('apophiscode', model)
  const result = new BlockAssembler()
  for await (const chunk of prepared.stream({ provider: 'apophiscode', model, sessionId: 'wiring-session', reasoningEffort: 'low', messages: [createUserMessage({ content: [{ type: 'text', text: '核对订单' }], source: { kind: 'user' } })] })) result.push(chunk)
  return result
}

test('explicit CLI and HTTP choices retain the existing transport and key wiring', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'apophis-wiring-cli-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'script.json'), JSON.stringify([{ blocks: [{ type: 'text', text: 'via cli' }] }]))
  let binary = FAKE_CLI
  if (process.platform === 'win32') {
    // Exercise the production npm-launcher resolver, without a command shell.
    await copyFile(FAKE_CLI, join(dir, 'fake-claude-cli.mjs'))
    binary = join(dir, 'claude.cmd')
    await writeFile(binary, '@ECHO OFF\r\n"node" "%~dp0\\fake-claude-cli.mjs" %*\r\n')
  } else await chmod(FAKE_CLI, 0o755)
  const previous = process.env.FAKE_CLAUDE_DIR
  process.env.FAKE_CLAUDE_DIR = dir
  t.after(() => { if (previous === undefined) delete process.env.FAKE_CLAUDE_DIR; else process.env.FAKE_CLAUDE_DIR = previous })
  const httpKeys = fakeGateway(t)
  const { ctx, seen } = context()
  const preference = { claudeCliPath: binary, claudeTransport: 'cli' }
  apply(ctx, preference)
  t.after(async () => { for (const dispose of seen.disposers) await dispose() })
  await seen.handler('keys/add', { key: CC_KEY, label: 'cc' })
  await seen.handler('keys/add', { key: SALE_KEY, label: 'cc-sale' })

  const viaCli = await turn(seen.adapter, 'claude-opus-5-5')
  assert.equal(viaCli.finish.kind, 'stop', JSON.stringify(viaCli.finish))
  assert.equal(viaCli.blocks().find(block => block.type === 'text').text, 'via cli')
  assert.deepEqual(httpKeys, [], 'the cc key never reached the HTTP route')
  const started = (await readFile(join(dir, 'log.jsonl'), 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(entry => entry.kind === 'start')
  assert.equal(started.length, 1)
  assert.equal(started[0].env.ANTHROPIC_BASE_URL, 'https://www.apophis.uk')

  const status = await seen.handler('status', {})
  await seen.handler('keys/select', { id: status.value.keys.find(key => key.label === 'cc-sale').id })
  preference.claudeTransport = 'http'
  const viaHttp = await turn(seen.adapter, 'claude-opus-5-5')
  assert.equal(viaHttp.blocks().find(block => block.type === 'text').text, 'via http')
  assert.deepEqual(httpKeys, [SALE_KEY])

  const groups = await seen.handler('groups', {})
  assert.deepEqual(groups.value.keys.map(key => [key.claudeTransport.transport, key.claudeTransport.reason]), [['http', 'preference'], ['http', 'preference']])
  const cli = await seen.handler('claude-cli/status', {})
  assert.equal(cli.value.installed, true)
  assert.equal(cli.value.version, '2.1.295')
  assert.equal(cli.value.path, binary)
  assert.equal(cli.value.processes.opened, 1)
})

test('a pinned HTTP route keeps a cc key off the CLI, and a pinned CLI route takes a cc-sale key through it', async t => {
  const httpKeys = fakeGateway(t)
  const { ctx, seen } = context()
  apply(ctx, { claudeCliPath: '/nonexistent/apophiscode-wiring-cli', claudeTransport: 'http' })
  t.after(async () => { for (const dispose of seen.disposers) await dispose() })
  await seen.handler('keys/add', { key: CC_KEY, label: 'cc' })
  const http = await turn(seen.adapter, 'claude-haiku-5-5')
  assert.equal(http.finish.kind, 'stop')
  assert.deepEqual(httpKeys, [CC_KEY])

  const pinned = context()
  apply(pinned.ctx, { claudeCliPath: '/nonexistent/apophiscode-wiring-cli', claudeTransport: 'cli' })
  t.after(async () => { for (const dispose of pinned.seen.disposers) await dispose() })
  await pinned.seen.handler('keys/add', { key: SALE_KEY, label: 'cc-sale' })
  const missing = await turn(pinned.seen.adapter, 'claude-haiku-5-5')
  assert.equal(missing.finish.kind, 'error')
  assert.match(missing.finish.failure.message, /本机没有可用的 Claude Code CLI/u)
  assert.deepEqual(httpKeys, [CC_KEY], 'no HTTP fallback when the CLI is pinned but missing')
  // Other models never involve the CLI.
  assert.equal((await pinned.seen.handler('claude-cli/status', {})).value.processes.opened, 0)
})

test('automatic Claude routing stays on HTTP when current-key membership is unknown', async t => {
  const httpKeys = fakeGateway(t)
  const { ctx, seen } = context()
  apply(ctx, { claudeCliPath: '/nonexistent/apophiscode-wiring-cli' })
  t.after(async () => { for (const dispose of seen.disposers) await dispose() })
  await seen.handler('keys/add', { key: CC_KEY, label: 'arbitrary cc label' })
  const result = await turn(seen.adapter, 'claude-haiku-5-5')
  assert.equal(result.finish.kind, 'stop')
  assert.deepEqual(httpKeys, [CC_KEY])
  const reading = await seen.handler('groups', {})
  assert.equal(reading.value.keys[0].groups, undefined)
  assert.deepEqual(reading.value.keys[0].claudeTransport, { transport: 'http', reason: 'unknown' })
})
