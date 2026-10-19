import assert from 'node:assert/strict'
import test from 'node:test'
import { credentialKey } from '@deepseek-ai/dsh-credentials'

import { ApophisCodeKeyRing } from '../src/key-ring.js'
import { createApophisCodeRpc } from '../src/rpc.js'
import { fakeCredentials } from './helpers.mjs'
import { anthropicStream } from './fixtures/anthropic.mjs'
import { createPluginHost, PLUGIN_TEST_KEY } from './plugin-host-fixture.mjs'
import { APOPHISCODE_MODEL_IDS } from '../src/catalog.js'

test('manual disable rotates only this plugin ring and the registered adapter no longer uses that key', async t => {
  const foreignId = credentialKey('other-provider-api', 'keys')
  const foreign = { kind: 'grant', payload: { marker: 'retain original other provider' } }
  const records = new Map([[foreignId, structuredClone(foreign)]])
  const host = await createPluginHost(t, { records, respond: ({ body }) => anthropicStream(body.model) })
  const otherKey = 'sk-disable-second-offline-fixture'
  await host.rpc('keys/add', { key: otherKey, label: 'Second' })
  const [first, second] = (await host.rpc('status')).value.keys
  const disabled = await host.rpc('keys/disable', { id: first.id, reason: PLUGIN_TEST_KEY })
  assert.equal(disabled.ok, true, JSON.stringify(disabled))
  assert.equal(disabled.value.activeId, second.id)
  assert.equal(disabled.value.keys[0].disabled, true)
  assert.equal(disabled.value.keys[0].disabledReason, 'user-disabled')
  assert.equal(disabled.value.keys[0].label, first.label)
  assert.equal(JSON.stringify(disabled).includes(PLUGIN_TEST_KEY), false)
  assert.equal((await host.adapter.listModels('apophiscode')).length, APOPHISCODE_MODEL_IDS.length)
  await host.turn({ model: 'claude-sonnet-5-5' })
  assert.equal(host.requests.at(-1).headers.get('authorization'), `Bearer ${otherKey}`)
  await host.rpc('keys/disable', { id: second.id })
  assert.deepEqual(await host.adapter.listModels('apophiscode'), [])
  await host.rpc('keys/enable', { id: first.id })
  await host.turn({ model: 'claude-sonnet-5-5' })
  assert.equal(host.requests.at(-1).headers.get('authorization'), `Bearer ${PLUGIN_TEST_KEY}`)
  const absent = await host.rpc('keys/disable', { id: 'unknown', reason: otherKey })
  assert.equal(absent.ok, false)
  assert.equal(absent.error.message, 'Unknown ApophisCode key')
  assert.equal(JSON.stringify(absent).includes(otherKey), false)
  assert.deepEqual(records.get(foreignId), foreign)
  assert.equal(host.accesses.some(access => access.id === foreignId), false)
})

test('manual disable invalidates balance and refreshes the public status without accepting a reason', async () => {
  const ring = new ApophisCodeKeyRing(fakeCredentials())
  const [key] = (await ring.add('sk-disable-cache-fixture')).keys
  const invalidated = []
  const rpc = createApophisCodeRpc({ ring, balance: { invalidate: () => invalidated.push('balance') },
    groups: { invalidate: () => invalidated.push('groups') }, hosts: () => ({}), preference: {} })
  const response = await rpc('keys/disable', { id: key.id, reason: 'untrusted reason must not be stored' })
  assert.equal(response.ok, true)
  assert.equal(response.value.keys[0].disabledReason, 'user-disabled')
  assert.equal(await ring.activeKey(), undefined)
  assert.deepEqual(invalidated, ['balance'], 'model coverage is unchanged; cached balance state is not')
})
