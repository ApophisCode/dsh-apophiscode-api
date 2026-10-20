#!/usr/bin/env node
/** Single-model live acceptance: the built plugin and a real native read-only memory tool. */
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'

import { apply, DEFAULT_API_HOST, normalizeHost } from '../lib/index.js'
import { EFFORT_IDS } from '../src/catalog.js'
import { exactModel } from './gateway-directory.mjs'
import { redactSecrets } from '../src/secret-redactor.js'
import { readStoredKey } from './stored-key.mjs'

const PROVIDER = 'apophiscode'
const TOOL_NAME = 'read_fixture_record'
const HELP = `Run one real two-request tool check using a key stored under Settings → ApophisCode.
The key is copied to memory; the script never changes stored credentials or DSH state.
The only executable tool reads one in-memory test record. API requests may consume quota.

Usage: node scripts/tool-check.mjs --model MODEL [options]
  --model MODEL        One exact active-key model ID (required; no automatic scan)
  --reasoning LEVEL    Explicit gateway-declared effort (omitted: gateway default)
  --key-label LABEL    Select one enabled plugin-owned key; otherwise use the active key
  --api-host ROOT      Explicit gateway root (default: ${DEFAULT_API_HOST})
  --timeout-ms MS      Timeout for each model request, 1000–300000 (default: 65000)
  --help              Show help without reading a credential`

/** Parse and validate every argument before any credential read or model request. */
export function parseToolCheckArgs(args) {
  if (args.includes('--help')) {
    if (args.length !== 1) throw new Error('--help must be used on its own')
    return { help: true }
  }
  const allowed = new Set(['--model', '--reasoning', '--key-label', '--api-host', '--timeout-ms'])
  const values = new Map()
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index], value = args[index + 1]
    if (!allowed.has(name)) throw new Error('Unknown tool-check option; use --help')
    if (values.has(name)) throw new Error('Tool-check options may only be supplied once')
    if (value === undefined || value.startsWith('--') || value.trim() === '') throw new Error('Each tool-check option needs a value')
    values.set(name, value)
  }
  const model = exactModel(values.get('--model'))
  const reasoning = values.get('--reasoning')
  if (reasoning !== undefined && !EFFORT_IDS.includes(reasoning)) throw new Error('Unknown reasoning effort')
  const timeoutMs = Number(values.get('--timeout-ms') ?? 65_000)
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300_000) throw new Error('--timeout-ms must be an integer between 1000 and 300000')
  const apiHost = values.get('--api-host') ?? DEFAULT_API_HOST
  let url
  try { url = new URL(apiHost) } catch { throw new Error('--api-host must be an absolute HTTP(S) gateway root') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('--api-host must be an HTTP(S) gateway root without credentials, query or fragment')
  }
  return { model, reasoning, timeoutMs, apiHost: normalizeHost(apiHost, DEFAULT_API_HOST), keyLabel: values.get('--key-label') }
}

/** Real apply/ToolRuntime composition with a private Map credential service; no network monkeypatch. */
export async function createToolCheck({ key, apiHost = DEFAULT_API_HOST, timeoutMs = 65_000 } = {}) {
  const records = new Map(), disposers = []
  const session = { id: `apophis-tool-check-${randomUUID()}`, header: {}, append: () => ({ seq: 1 }) }
  const agent = { session }
  const toolContext = new Context()
  toolContext.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder: () => 1 })
  toolContext.provide('agents', { currentInitiator: () => agent })
  const runtime = new ToolRuntime(toolContext, { mode: 'native' })
  const recordId = `检查-${randomUUID()}`
  const recordValue = `校验值-${randomUUID()}`
  let executions = 0
  runtime.register({
    name: TOOL_NAME,
    description: 'Read one supplied in-memory test record. This tool never accesses files, shell commands or external services.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    output: {
      schema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
      render: (_args, result) => [{ type: 'text', text: JSON.stringify(result) }],
    },
    async execute(args) {
      executions += 1
      if (args.id !== recordId) throw new Error('The in-memory test record ID did not match')
      return { value: recordValue }
    },
  })
  let adapter, rpc, closed = false
  const ctx = {
    credentials: {
      readRecord: async id => records.get(id),
      async modifyRecord(id, mutate) {
        const next = await mutate(records.get(id))
        if (next !== undefined) records.set(id, next)
        return records.get(id)
      },
    },
    logger: { warn() {}, info() {} },
    llm: {
      registerAdapter(providers, instance) {
        if (providers.length !== 1 || providers[0] !== PROVIDER || adapter !== undefined) throw new Error('Unexpected built plugin route')
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
      if (names.includes('connection')) callback({ effect: ctx.effect, connection: { rpc: {
        handle(channel, handler) {
          if (channel !== '/apophiscode-api') throw new Error('Unexpected built plugin RPC identity')
          rpc = handler
          return () => {}
        },
      } } })
    },
  }
  async function close() {
    if (closed) return
    closed = true
    for (const dispose of disposers.reverse()) await dispose()
    await toolContext.fiber.dispose()
    records.clear()
  }
  try {
    apply(ctx, { apiHost, statusHost: apiHost, claudeTransport: 'http', imageEnabled: false })
    if (adapter === undefined || rpc === undefined) throw new Error('The built plugin did not register its route and RPC')
    if (!(await rpc('keys/add', { key, label: 'read-only memory acceptance check' })).ok) throw new Error('The plugin refused the check credential')
  } catch (error) { await close(); throw error }

  const scrub = value => redactSecrets(String(value), [key]).slice(0, 400)
  const target = normalizeHost(apiHost, DEFAULT_API_HOST).replace(/\/(?:v1|v1beta)$/u, '')
  async function turn(model, reasoning, messages) {
    const signal = AbortSignal.timeout(timeoutMs)
    const prepared = await adapter.prepareCall(PROVIDER, model, signal)
    const assembled = new BlockAssembler()
    for await (const chunk of prepared.stream({ provider: PROVIDER, model, sessionId: session.id,
      reasoningEffort: reasoning, maxTokens: 2048, signal, messages, tools: runtime.schemas(agent),
      system: 'You are an assistant inside DeepSeek Harness. Follow the user request using only the supplied DSH tools.',
    })) assembled.push(chunk)
    return assembled
  }
  return {
    close,
    async run({ model, reasoning }) {
      exactModel(model)
      const descriptor = await adapter.resolveModel(PROVIDER, model)
      if (reasoning !== undefined && !descriptor.reasoning?.efforts.some(entry => entry.id === reasoning)) throw new Error('The gateway has not declared this reasoning effort')
      const outcome = { model, target, reasoning, ok: false, modelTurns: 0, executions: 0 }
      const startExecutions = executions
      const fail = (message, code = 'TOOL_CHECK') => { throw Object.assign(new Error(message), { code }) }
      const requireFinish = (assembled, expected) => {
        if (assembled.finish?.kind === expected) return
        fail(assembled.finish?.failure?.message ?? `Expected ${expected}, received ${assembled.finish?.kind ?? 'no finish'}`,
          assembled.finish?.failure?.code ?? 'TOOL_CHECK')
      }
      try {
        const messages = [createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text:
          `这是内存只读工具验收。请调用 ${TOOL_NAME}，查询 id 为 ${JSON.stringify(recordId)} 的记录。收到工具结果后，用中文回答并原样包含返回的 value 值。只调用一次工具。`,
        }] })]
        outcome.modelTurns += 1
        const first = await turn(model, reasoning, messages)
        outcome.firstFinish = first.finish?.kind
        requireFinish(first, 'tool-calls')
        const calls = first.blocks().filter(block => block.type === 'tool-call')
        if (calls.length !== 1 || calls[0].name !== TOOL_NAME) fail('Expected exactly one offered read-only memory tool call')
        const [call] = calls
        const args = JSON.parse(call.arguments)
        const result = await runtime.execute({ callId: call.id, name: call.name, arguments: args, agent, signal: AbortSignal.timeout(timeoutMs) })
        if (result.isError) fail('The real native memory tool execution failed')
        outcome.executions = executions - startExecutions
        if (outcome.executions !== 1) fail('The memory tool did not execute exactly once')
        const history = JSON.parse(JSON.stringify([...messages,
          first.message({ kind: 'model', provider: PROVIDER, model, replayState: first.replayState }),
          createToolResultMessage({ callId: call.id, content: result.content, isError: result.isError }),
        ]))
        outcome.modelTurns += 1
        const second = await turn(model, reasoning, history)
        outcome.secondFinish = second.finish?.kind
        requireFinish(second, 'stop')
        if (second.blocks().some(block => block.type === 'tool-call')) fail('The continuation called a tool again')
        const answer = second.blocks().filter(block => block.type === 'text').map(block => block.text).join('')
        outcome.valueMatched = answer.includes(recordValue)
        if (!outcome.valueMatched) fail('The final answer did not contain the value returned by the executed tool')
        outcome.ok = true
      } catch (error) {
        outcome.executions = executions - startExecutions
        outcome.failure = { code: error.code ?? 'TOOL_CHECK', message: scrub(error instanceof Error ? error.message : error) }
      }
      return outcome
    },
  }
}

export async function main(args = process.argv.slice(2), { readKey = readStoredKey, createCheck = createToolCheck, write = console.log } = {}) {
  let key, check, exitCode = 1
  try {
    const options = parseToolCheckArgs(args)
    if (options.help) { write(HELP); return 0 }
    key = await readKey({ label: options.keyLabel })
    check = await createCheck({ key, apiHost: options.apiHost, timeoutMs: options.timeoutMs })
    const outcome = await check.run(options)
    write(redactSecrets(JSON.stringify(outcome), [key]))
    exitCode = outcome.ok ? 0 : 1
  } catch (error) {
    write(JSON.stringify({ ok: false, failure: { code: 'TOOL_CHECK_SETUP', message: redactSecrets(error instanceof Error ? error.message : String(error), [key]).slice(0, 400) } }))
  } finally {
    try { await check?.close() } catch (error) {
      write(JSON.stringify({ ok: false, failure: { code: 'TOOL_CHECK_CLEANUP', message: redactSecrets(error instanceof Error ? error.message : String(error), [key]).slice(0, 400) } }))
      exitCode = 1
    }
  }
  return exitCode
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main()
}
