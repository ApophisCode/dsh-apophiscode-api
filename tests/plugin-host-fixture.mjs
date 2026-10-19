/** Shared offline host seam: real plugin, SDK codecs, native tools and persisted history. */
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'

import { apply } from '../src/index.js'
import { APOPHISCODE_MODEL_IDS } from '../src/catalog.js'

export const PLUGIN_TEST_KEY = 'sk-apophis-host-offline-fixture'
export const PLUGIN_TEST_PROVIDER = 'apophiscode'
export const memoryTool = Object.freeze({
  name: 'lookup_memory',
  description: 'Read a supplied value from an in-memory fixture. No files or external services are accessed.',
  parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
  output: {
    schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    render: (_args, result) => [{ type: 'text', text: result.text }],
  },
  execute: async args => ({ text: `内存记录：${args.query}` }),
})

export const userMessage = text => createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text }] })
export const textOf = assembled => assembled.blocks().filter(block => block.type === 'text').map(block => block.text).join('')

/**
 * `respond({ request, url, headers, body, index })` returns real wire Responses;
 * index is one-based. Only global fetch is replaced, never a provider method.
 * `records` is a Map keyed by credential record id, and `accesses` records every
 * read/write. All keys here are offline fixtures, never a credentials file.
 */
export async function createPluginHost(t, {
  config = {}, respond, tool = memoryTool, key = PLUGIN_TEST_KEY, records = new Map(),
  applyPlugin = apply, realFetch = false,
  modelIds = APOPHISCODE_MODEL_IDS,
} = {}) {
  if (realFetch) assert.match(config.apiHost, /^http:\/\/127\.0\.0\.1:\d+$/u, 'real network fixtures stay on an explicit loopback server')
  else assert.equal(typeof respond, 'function', 'an explicit network fixture is required')
  const requests = [], executions = [], accesses = [], sessionEvents = [], disposers = []
  const session = { id: 'plugin-host-fixture-session', header: {}, append(event) {
    sessionEvents.push(event)
    return { seq: sessionEvents.length }
  } }
  const agent = { session }
  const toolContext = new Context()
  toolContext.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder: () => 1 })
  toolContext.provide('agents', { currentInitiator: () => agent })
  const runtime = new ToolRuntime(toolContext, { mode: 'native' })
  runtime.register({ ...tool, execute: async (args, exec) => {
    const execution = { arguments: structuredClone(args), callId: exec.callId }
    executions.push(execution)
    const value = await tool.execute(args, exec)
    execution.value = value
    return value
  } })

  let adapter, rpc
  const ctx = {
    credentials: {
      async readRecord(id) { accesses.push({ type: 'read', id }); return records.get(id) },
      async modifyRecord(id, mutate) {
        accesses.push({ type: 'write', id })
        const next = await mutate(records.get(id))
        if (next !== undefined) records.set(id, next)
        return records.get(id)
      },
    },
    logger: { warn() {}, info() {} },
    llm: {
      registerAdapter(providers, instance) {
        assert.deepEqual(providers, [PLUGIN_TEST_PROVIDER])
        assert.equal(adapter, undefined, 'the plugin registers one model adapter')
        adapter = instance
        return () => {}
      },
      registerConfigurableProviders: () => () => {},
    },
    get: name => name === 'agents' ? { currentInitiator: () => agent } : undefined,
    effect(callback) {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer)
      return disposer
    },
    inject(names, callback) {
      // No browser, settings, image or external tool service is mounted.
      if (names.includes('connection')) callback({ effect: ctx.effect, connection: { rpc: {
        handle(channel, handler) {
          assert.equal(channel, '/apophiscode-api')
          rpc = handler
          return () => {}
        },
      } } })
    },
  }
  applyPlugin(ctx, { claudeTransport: 'http', claudeCliPath: '/nonexistent/apophis-host-fixture-cli', ...config })
  assert.ok(adapter)
  assert.ok(rpc)
  const added = await rpc('keys/add', { key, label: 'offline host fixture' })
  assert.equal(added.ok, true)
  assert.equal(JSON.stringify(added).includes(key), false, 'RPC never exposes the key')

  const mocked = realFetch ? undefined : t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    if (request.method === 'GET' && new URL(request.url).pathname.endsWith('/v1/models')) {
      const ids = typeof modelIds === 'function' ? modelIds(request) : modelIds
      return ids === null ? new Response('model list unavailable', { status: 503 })
        : Response.json({ data: ids.map(id => ({ id })) })
    }
    if (request.method === 'GET' && new URL(request.url).pathname.endsWith('/api/v1/model-plaza')) {
      return Response.json({ code: 0, data: { groups: [] } })
    }
    const call = { request, url: request.url, headers: request.headers, body: await request.clone().json(), index: requests.length + 1 }
    requests.push(call)
    const response = await respond(call)
    assert.ok(response instanceof Response, 'every network request needs an explicit wire Response')
    return response
  })
  let closed = false
  async function close() {
    if (closed) return
    closed = true
    mocked?.mock.restore()
    for (const dispose of disposers.reverse()) await dispose()
    await toolContext.fiber.dispose()
  }
  t.after(close)

  /** No finish assertions: error and cancellation tests inspect the real outcome. */
  async function turn({ model, prompt = '读取内存记录。', messages = [userMessage(prompt)], onChunk, ...controls }) {
    const prepared = await adapter.prepareCall(PLUGIN_TEST_PROVIDER, model, controls.signal)
    const assembled = new BlockAssembler(), chunks = []
    const options = {
      sessionId: session.id, reasoningEffort: model === 'deepseek-v4-pro' ? 'high' : 'low', maxTokens: 2048,
      system: 'You are an assistant inside DeepSeek Harness. Use only the supplied DSH tools.',
      tools: runtime.schemas(agent), messages, ...controls, provider: PLUGIN_TEST_PROVIDER, model,
    }
    for await (const chunk of prepared.stream(options)) {
      chunks.push(chunk)
      assembled.push(chunk)
      await onChunk?.(chunk)
    }
    return { assembled, chunks, messages }
  }

  /** One model call, one real native execution, persisted history, then one model continuation. */
  async function toolRoundTrip({ model, prompt, messages = [userMessage(prompt ?? '读取内存记录。')], expectedArguments, ...controls }) {
    const startRequests = requests.length, startExecutions = executions.length
    const firstTurn = await turn({ model, messages, ...controls })
    const first = firstTurn.assembled
    assert.equal(first.finish?.kind, 'tool-calls', JSON.stringify(first.finish))
    const calls = first.blocks().filter(block => block.type === 'tool-call')
    assert.equal(calls.length, 1, 'the first turn produces exactly one tool call')
    const [call] = calls
    assert.equal(call.name, tool.name, 'the decoded call matches the registered DSH tool')
    const args = JSON.parse(call.arguments)
    if (expectedArguments !== undefined) assert.deepEqual(args, expectedArguments)
    const toolResult = await runtime.execute({ callId: call.id, name: call.name, arguments: args,
      agent, signal: controls.signal ?? new AbortController().signal })
    assert.equal(toolResult.isError, false, JSON.stringify(toolResult.content))
    assert.equal(executions.length - startExecutions, 1, 'ToolRuntime actually executes the tool once')
    const persisted = JSON.parse(JSON.stringify([
      ...messages,
      first.message({ kind: 'model', provider: PLUGIN_TEST_PROVIDER, model, replayState: first.replayState }),
      createToolResultMessage({ callId: call.id, content: toolResult.content, isError: toolResult.isError }),
    ]))
    const secondTurn = await turn({ model, messages: persisted, ...controls })
    const second = secondTurn.assembled
    assert.equal(second.finish?.kind, 'stop', JSON.stringify(second.finish))
    assert.equal(second.blocks().filter(block => block.type === 'tool-call').length, 0)
    assert.equal(executions.length - startExecutions, 1)
    assert.equal(requests.length - startRequests, 2, 'a successful tool loop makes exactly two model requests')
    return { first, second, firstChunks: firstTurn.chunks, secondChunks: secondTurn.chunks, call, toolResult,
      executed: executions.length - startExecutions, messages: persisted, requests: requests.slice(startRequests) }
  }

  return { adapter, rpc, runtime, agent, requests, records, accesses, executions, sessionEvents, turn, toolRoundTrip, close }
}
