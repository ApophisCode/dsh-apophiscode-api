import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { startClaudeCliSession } from '../src/claude-cli-session.js'
import { MCP_TOOL_PREFIX } from '../src/claude-mcp-bridge.js'

/** Drive the actual session's two independent input channels in a fixed order. */
async function sessionFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'apophis-cli-order-'))
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.stdin = Object.assign(new EventEmitter(), { write() {}, end() {} })
  child.exitCode = null
  child.signalCode = null
  child.kill = () => { child.exitCode = 0; queueMicrotask(() => child.emit('close', 0)); return true }
  let onCall
  const session = await startClaudeCliSession({
    binary: async () => 'fixture-cli', configDir: join(directory, 'home'),
    runDirectory: join(directory, 'run'), baseUrl: 'https://gateway.invalid',
    apiKey: 'sk-session-order-fixture', sessionId: 'session-order',
    request: { model: 'claude-sonnet-5-5', system: 'Fixture', tools: [] },
    conversation: { history: [], input: [] },
    spawnImpl: () => child,
    startBridge: async options => {
      onCall = options.onCall
      return { url: 'http://127.0.0.1:1/mcp', authorization: 'fixture-capability', close: async () => {} }
    },
  })
  t.after(async () => { await session.dispose(); await rm(directory, { recursive: true, force: true }) })
  const event = value => child.stdout.emit('data', `${JSON.stringify({ type: 'stream_event', event: value })}\n`)
  const finishTools = () => {
    event({ type: 'message_start', message: { id: 'fixture-message', role: 'assistant', content: [] } })
    for (const [index, id] of ['call-first', 'call-second'].entries()) {
      event({ type: 'content_block_start', index, content_block: { type: 'tool_use', id, name: `${MCP_TOOL_PREFIX}bash`, input: {} } })
      event({ type: 'content_block_stop', index })
    }
    event({ type: 'message_delta', delta: { stop_reason: 'tool_use' } })
    event({ type: 'message_stop' })
  }
  return { session, call: value => onCall(value), event, finishTools }
}

// Binding and result delivery are synchronous; a still-pending promise on the
// next event-loop turn is the bug, without a timing-dependent sleep/timeout.
const settled = promise => Promise.race([
  promise.then(value => ({ value })),
  new Promise(resolve => setImmediate(() => resolve({ pending: true }))),
])
const results = () => new Map(['call-first', 'call-second'].map((id, index) => [id, { type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: `result ${index}` }] }]))

test('anonymous MCP calls arriving before stdout bind to both same-name tool IDs once', async t => {
  const fixture = await sessionFixture(t)
  const firstResponse = fixture.session.respond({ kind: 'start' })
  const first = fixture.call({ name: 'bash' })
  const second = fixture.call({ name: 'bash' })
  fixture.finishTools()
  await (await firstResponse).text()
  assert.deepEqual(fixture.session.pendingToolIds, ['call-first', 'call-second'])
  const controller = new AbortController()
  const nextResponse = fixture.session.respond({ kind: 'tools', results: results() }, controller.signal)
  const observed = await Promise.all([settled(first), settled(second)])
  assert.deepEqual(observed.map(item => item.value?.content?.[0]?.text), ['result 0', 'result 1'])
  controller.abort()
  await assert.rejects(nextResponse)
})

test('a late anonymous MCP call takes the next same-name result already supplied by DSH', async t => {
  const fixture = await sessionFixture(t)
  const firstResponse = fixture.session.respond({ kind: 'start' })
  fixture.finishTools()
  await (await firstResponse).text()
  const first = fixture.call({ name: 'bash' })
  const controller = new AbortController()
  const nextResponse = fixture.session.respond({ kind: 'tools', results: results() }, controller.signal)
  assert.equal((await first).content[0].text, 'result 0')
  const second = await fixture.call({ name: 'bash' })
  assert.equal(second.content[0].text, 'result 1')
  controller.abort()
  await assert.rejects(nextResponse)
})

test('disposing a session releases every anonymous call waiting for stdout declarations', async t => {
  const fixture = await sessionFixture(t)
  const first = fixture.call({ name: 'bash' })
  const second = fixture.call({ name: 'bash' })
  await fixture.session.dispose()
  const observed = await Promise.all([settled(first), settled(second)])
  assert.deepEqual(observed.map(item => item.value?.isError), [true, true])
})
