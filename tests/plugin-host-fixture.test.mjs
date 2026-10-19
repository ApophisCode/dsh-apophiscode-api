import assert from 'node:assert/strict'
import test from 'node:test'
import { credentialKey } from '@deepseek-ai/dsh-credentials'

import { anthropicStream } from './fixtures/anthropic.mjs'
import { createPluginHost, textOf } from './plugin-host-fixture.mjs'

test('the shared host fixture registers the real plugin, executes a native tool and keeps credential records isolated', async t => {
  const oldId = credentialKey('other-provider-api', 'keys')
  const oldRecord = { kind: 'grant', payload: { untouched: 'original other provider fixture' } }
  const records = new Map([[oldId, structuredClone(oldRecord)]])
  const host = await createPluginHost(t, { records, respond: ({ body, index }) => anthropicStream(body.model,
    index === 1 ? { type: 'tool_use', id: 'call_shared', name: body.tools[0].name, input: { query: '中文🔎' } }
      : { type: 'text', text: '内存读取完成。' }),
  })
  const result = await host.toolRoundTrip({ model: 'claude-haiku-5-5', expectedArguments: { query: '中文🔎' } })
  assert.equal(result.executed, 1)
  assert.equal(result.call.id, 'call_shared')
  assert.equal(textOf(result.second), '内存读取完成。')
  assert.deepEqual(records.get(oldId), oldRecord)
  assert.equal(host.accesses.some(access => access.id === oldId), false)
  assert.equal(host.requests.length, 2)
  assert.ok(host.requests.every(call => new URL(call.url).origin === 'https://www.apophis.uk'))
  assert.deepEqual(host.executions[0].arguments, { query: '中文🔎' })
})
