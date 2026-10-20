import { modelRow } from './fixtures/declared-gateway.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'

import { APOPHISCODE_MODEL_IDS } from './fixtures/declared-gateway.mjs'
import { apply, Config } from '../src/index.js'
import { createModelSelectionController, readHiddenModels } from '../src/model-selection.js'
import { fieldValue } from '../src/preferences.js'
import { ApophisCodeKeyRing } from '../src/key-ring.js'
import { createRouteAdapter } from './fixtures/declared-gateway.mjs'
import { fakeCredentials, singleKeyRecord } from './helpers.mjs'

/** DSH 0.2.1 lists a route's models only once its key resolves. */
const KEY = 'sk-model-selection-fixture-not-a-real-key'

test.beforeEach(t => {
  t.mock.method(globalThis, 'fetch', async input => new URL(typeof input === 'string' ? input : input.url).pathname.endsWith('/v1/models')
    ? Response.json({ data: APOPHISCODE_MODEL_IDS.map(modelRow) })
    : Response.json({ code: 0, data: { groups: [] } }))
})

/** Exercise both real settings seams and the registered model adapter/RPC. */
function host({ generation = '0.2', writable = true, failWrite = false, initial = {} } = {}) {
  let values = { ...initial }
  const seen = { updates: [], notifications: 0, handler: undefined, adapter: undefined, listeners: new Map() }
  let hooks
  const settings = {
    writable,
    async update(id, patch) {
      assert.equal(id, 'apophiscode-api')
      if (failWrite) throw new Error('fixture: storage failed')
      seen.updates.push(patch)
      values = { ...values, ...patch }
      if (generation === '0.1') hooks.onChange()
      else seen.listeners.get('loader/volatile-update')?.()
    },
    configure: () => () => {},
  }
  if (generation === '0.1') {
    settings.installSection = (_ctx, _ns, _schema, source, callbacks) => {
      values = { ...source, ...values }
      hooks = callbacks
      hooks.setSource(() => values)
    }
  }
  const ctx = {
    credentials: fakeCredentials({ record: singleKeyRecord(KEY) }),
    logger: { warn() {} },
    fiber: { entry: { options: { id: 'apophiscode-api' } } },
    llm: {
      registerAdapter(_providers, adapter) {
        seen.adapter = adapter
        const handle = () => {}
        handle.replace = providers => {
          assert.deepEqual(providers, ['apophiscode'])
          seen.notifications += 1
        }
        return handle
      },
      registerConfigurableProviders: () => () => {},
    },
    get: () => undefined,
    on(event, callback) { seen.listeners.set(event, callback) },
    inject(names, callback) {
      if (names.includes('settings')) return callback({ settings, effect: ctx.effect })
      if (names.includes('connection')) return callback({ effect: ctx.effect, connection: { rpc: { handle(_channel, handler) { seen.handler = handler; return () => {} } } } })
      // These fixtures intentionally mount no search or image tool service.
    },
    effect(callback) { return callback() },
  }
  const config = generation === '0.2' ? { hiddenModels: { get: () => values.hiddenModels } } : {}
  apply(ctx, config)
  return {
    seen,
    changeHidden(ids) { values = { ...values, hiddenModels: ids }; seen.listeners.get('loader/volatile-update')() },
    reapply: () => host({ generation, initial: values }),
  }
}

test('model preferences are volatile, default to all models and expose only public descriptors', async () => {
  assert.equal(Config.dict.hiddenModels.meta.volatile, true)
  assert.deepEqual(fieldValue(new Config({}).hiddenModels), [])
  const { seen } = host()
  const reply = await seen.handler('models/status')
  assert.equal(reply.ok, true)
  assert.equal(reply.value.writable, true)
  assert.deepEqual(reply.value.models.map(model => model.id), [...APOPHISCODE_MODEL_IDS])
  assert.ok(reply.value.models.every(model => model.selected))
  assert.deepEqual(reply.value.models.find(model => model.id === 'deepseek-v4-pro'), {
    id: 'deepseek-v4-pro', name: 'deepseek-v4-pro', selected: true,
  })
  assert.deepEqual(reply.value.models.find(model => model.id === 'deepseek-v4.1-flash'), {
    id: 'deepseek-v4.1-flash', name: 'deepseek-v4.1-flash', selected: true,
  })
  assert.deepEqual(Object.keys(reply.value.models[0]).sort(), ['id', 'name', 'selected'])
  assert.deepEqual((await seen.adapter.listModels('apophiscode')).map(model => model.id), [...APOPHISCODE_MODEL_IDS])
})

for (const generation of ['0.1', '0.2']) {
  test(`DSH ${generation}: checkboxes persist, refresh the picker, and survive plugin reconstruction`, async () => {
    const env = host({ generation })
    const { seen } = env
    const reply = await seen.handler('models/update', { selectedIds: ['deepseek-v4-pro', 'deepseek-v4.1-flash', 'deepseek-v4-pro'] })
    assert.equal(reply.ok, true)
    assert.deepEqual(reply.value.models.filter(model => model.selected).map(model => model.id), ['deepseek-v4-pro', 'deepseek-v4.1-flash'])
    assert.deepEqual(seen.updates, [{ hiddenModels: APOPHISCODE_MODEL_IDS.filter(id => !['deepseek-v4-pro', 'deepseek-v4.1-flash'].includes(id)) }])
    assert.equal(seen.notifications, 1, 'one registry refresh, even when the settings hook fires during the write')
    assert.deepEqual((await seen.adapter.listModels('apophiscode')).map(model => model.id), ['deepseek-v4-pro', 'deepseek-v4.1-flash'])
    assert.deepEqual((await env.reapply().seen.adapter.listModels('apophiscode')).map(model => model.id), ['deepseek-v4-pro', 'deepseek-v4.1-flash'])

    // Resolution and preparation use the full catalog for existing sessions.
    const hidden = await seen.adapter.resolveModel('apophiscode', 'gpt-6.1-sol')
    assert.equal(hidden.id, 'gpt-6.1-sol')
    assert.equal((await seen.adapter.prepareCall('apophiscode', 'gpt-6.1-sol')).model.id, 'gpt-6.1-sol')
    assert.equal((await seen.adapter.resolveModel('apophiscode', 'claude-opus-5-5')).id, 'claude-opus-5-5')

    await seen.handler('models/update', { selectedIds: [] })
    assert.deepEqual(await seen.adapter.listModels('apophiscode'), [], 'Select none must not revert to all')
    const all = await seen.handler('models/update', { selectedIds: [...APOPHISCODE_MODEL_IDS] })
    assert.ok(all.value.models.every(model => model.selected))
    assert.deepEqual(seen.updates.at(-1), { hiddenModels: [] })
    assert.equal(seen.notifications, 3)
  })
}

test('a volatile edit elsewhere refreshes only once, without changing other settings', async () => {
  const { seen, changeHidden } = host()
  await seen.handler('models/status')
  changeHidden(['gpt-6-astra', 'deepseek-v4.1-flash'])
  assert.equal(seen.notifications, 1)
  changeHidden(['deepseek-v4.1-flash', 'gpt-6-astra', 'deepseek-v4.1-flash', 'future-model'])
  assert.equal(seen.notifications, 1, 'order, duplicates and unknown exclusions do not change the picker')
  assert.deepEqual(seen.updates, [])
  assert.ok((await seen.adapter.listModels('apophiscode')).some(model => model.id === 'deepseek-v4-pro'), 'new models default to selected')
})

test('unsupported selections are refused without writing preferences', async () => {
  const { seen } = host()
  for (const selectedIds of [undefined, null, 'deepseek-v4-pro', ['unknown'], [1], ['deepseek-v4-pro', {}]]) {
    const reply = await seen.handler('models/update', { selectedIds })
    assert.equal(reply.ok, false)
    assert.match(reply.error.message, /not supported/u)
    assert.equal(typeof reply.error.code, 'string')
    assert.deepEqual(reply.error.details, {})
  }
  assert.deepEqual(seen.updates, [])
  assert.equal(seen.notifications, 0)
})

for (const generation of ['0.1', '0.2']) {
  test(`DSH ${generation}: read-only and failed saves keep the previous selection`, async () => {
    for (const options of [{ writable: false }, { failWrite: true }]) {
      const { seen } = host({ generation, ...options })
      const before = await seen.handler('models/status')
      assert.equal(before.value.writable, options.writable !== false)
      const failure = await seen.handler('models/update', { selectedIds: [] })
      assert.equal(failure.ok, false)
      assert.equal(typeof failure.error.code, 'string')
      assert.deepEqual(failure.error.details, {})
      assert.deepEqual((await seen.handler('models/status')).value.models, before.value.models)
      assert.deepEqual(seen.updates, [])
      assert.equal(seen.notifications, 0)
    }
  })
}

test('legacy, missing and invalid preference values keep the default; volatile exclusions are read', () => {
  for (const preference of [undefined, {}, { hiddenModels: null }, { hiddenModels: 'deepseek-v4-pro' }]) {
    assert.deepEqual(readHiddenModels(preference), [])
  }
  assert.deepEqual(readHiddenModels({ hiddenModels: { get: () => ['deepseek-v4-pro', 'unknown', 'unknown', 1] } }), ['deepseek-v4-pro', 'unknown'])
})

test('raw dated IDs and unknown metadata can be selected, and exclusions survive active-directory changes', async () => {
  const alias = 'deepseek-v4-flash-0731', unknown = 'deepseek-future-unknown'
  let ids = new Set([alias, unknown]), preferences = {}, notifications = 0
  const selection = createModelSelectionController({
    availableModelIds: async () => ids,
    readPreference: () => preferences,
    writePreference: async patch => { preferences = { ...preferences, ...patch } },
    isWritable: () => true, onChange: () => { notifications += 1 },
  })
  assert.deepEqual((await selection.status()).models.map(model => model.id), [alias, unknown])
  await selection.update({ selectedIds: [unknown] })
  assert.equal(selection.isVisible(alias), false)
  assert.equal(notifications, 1)
  ids = new Set(['deepseek-v4-pro'])
  await selection.status()
  await selection.update({ selectedIds: [] })
  assert.ok(preferences.hiddenModels.includes(alias), 'editing a second key does not discard the first key exclusions')
  ids = new Set([alias, unknown])
  const restored = await selection.status()
  assert.equal(restored.models.find(model => model.id === alias).selected, false)
  assert.equal(restored.models.find(model => model.id === unknown).unavailableReason, undefined)
})

test('the actual DSH LLM registry refreshes discovery atomically and keeps a prepared call usable', async () => {
  const ctx = new Context()
  const llm = new LlmRuntime(ctx)
  let preferences = {}
  let registration
  let notifications = 0
  ctx.on('llm/adapters-updated', () => { notifications += 1 })
  const selection = createModelSelectionController({
    availableModelIds: async () => new Set(APOPHISCODE_MODEL_IDS),
    readPreference: () => preferences,
    writePreference: async patch => { preferences = { ...preferences, ...patch } },
    isWritable: () => true,
    onChange: () => registration.replace(['apophiscode']),
  })
  const ring = new ApophisCodeKeyRing(fakeCredentials({ record: singleKeyRecord(KEY) }))
  const keys = { active: () => ring.activeKey(), forRequest: (_model, key) => key, onKeyFailure() {} }
  const adapter = createRouteAdapter({ ring, keys, isModelVisible: selection.isVisible, availableModelIds: async () => new Set(APOPHISCODE_MODEL_IDS) })
  registration = llm.registerAdapter(['apophiscode'], adapter)
  const prepared = await adapter.prepareCall('apophiscode', 'deepseek-v4.1-flash')
  const before = notifications
  await selection.update({ selectedIds: [] })
  assert.equal(notifications, before + 1)
  assert.deepEqual(await llm.listModels('apophiscode'), [])
  assert.equal((await adapter.resolveModel('apophiscode', 'deepseek-v4.1-flash')).id, 'deepseek-v4.1-flash')
  assert.equal(prepared.model.id, 'deepseek-v4.1-flash')
  assert.equal(typeof prepared.stream, 'function')
  await selection.update({ selectedIds: ['deepseek-v4-pro'] })
  assert.deepEqual((await llm.listModels('apophiscode')).map(model => model.id), ['deepseek-v4-pro'])
  registration()
})
