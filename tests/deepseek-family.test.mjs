import assert from 'node:assert/strict'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import { eventStream, responseFrames } from './fixtures/openai.mjs'
import { createPluginHost, textOf } from './plugin-host-fixture.mjs'

const plugin = process.env.APOPHIS_TEST_ENTRY
  ? await import(pathToFileURL(process.env.APOPHIS_TEST_ENTRY).href)
  : await import('../src/index.js')
const IDS = ['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-0731', 'deepseek-v4-pro', 'deepseek-v4.1-flash', 'deepseek-v4.1-flash-expires-on-0910']

test('the registered picker and settings preserve every exact active-key ID and raw name', async t => {
  const host = await createPluginHost(t, { applyPlugin: plugin.apply,
    modelIds: IDS,
    respond: () => assert.fail('discovery must not send a model POST'),
  })
  const listed = await host.adapter.listModels('apophiscode')
  assert.deepEqual(listed.map(model => model.id), IDS)
  assert.ok(listed.every(model => model.name === model.id))
  assert.deepEqual((await host.rpc('models/status')).value.models.map(model => model.id), IDS)
  assert.ok((await host.rpc('models/status')).value.models.every(model => model.name === model.id))
  const resolved = await Promise.all(listed.map(model => host.adapter.resolveModel('apophiscode', model.id)))
  assert.ok(resolved.every(model => model.name === model.id))
})

for (const model of IDS) {
  test(`${model}: exact Responses ID, server default and a real two-turn tool loop`, async t => {
    const host = await createPluginHost(t, { applyPlugin: plugin.apply, modelIds: IDS, respond: ({ index }) => eventStream(responseFrames(model,
      index === 1 ? { tool: { id: 'call_family', name: 'lookup_memory', argumentsParts: ['{"query":"中文📦"}'] } }
        : { textParts: ['已读取', '中文📦。'] }), { bytewise: true }),
    })
    const result = await host.toolRoundTrip({ model, reasoningEffort: undefined, expectedArguments: { query: '中文📦' } })
    assert.equal(textOf(result.second), '已读取中文📦。')
    assert.equal(result.executed, 1)
    for (const call of result.requests) {
      assert.equal(call.url, 'https://www.apophis.uk/v1/responses')
      assert.equal(call.body.model, model)
      assert.equal(call.body.reasoning, undefined)
      assert.equal(call.body.prompt_cache_key, 'plugin-host-fixture-session')
    }
  })

  test(`${model}: model_not_found stays visible without a hidden alias or tool execution`, async t => {
    const host = await createPluginHost(t, { applyPlugin: plugin.apply, modelIds: IDS,
      respond: () => Response.json({ error: { code: 'model_not_found', message: 'not supported by any configured account in this group' } }, { status: 404 }),
    })
    const result = await host.turn({ model, reasoningEffort: 'high' })
    assert.equal(result.assembled.finish.kind, 'error')
    assert.match(result.assembled.finish.failure.message, /not supported by any configured account/u)
    assert.equal(host.requests.length, 1)
    assert.equal(host.requests[0].body.model, model)
    assert.equal(host.executions.length, 0)
  })
}

test('unknown key coverage fails visibly and never advertises the whole catalog', async t => {
  const host = await createPluginHost(t, { applyPlugin: plugin.apply, modelIds: null,
    respond: () => assert.fail('discovery must not send a model POST'),
  })
  await assert.rejects(host.adapter.listModels('apophiscode'), /coverage|model list/iu)
  const reply = await host.rpc('models/status')
  assert.equal(reply.ok, false)
  assert.match(reply.error.message, /coverage|model list/iu)
})

test('unknown DeepSeek efforts stay unknown while the requested Responses policy preserves business rejection', async t => {
  const unknown = 'deepseek-future-unknown'
  const host = await createPluginHost(t, { applyPlugin: plugin.apply, modelIds: ['deepseek-v4-pro', unknown],
    respond: ({ body }) => body.model === unknown
      ? Response.json({ error: { message: 'unknown model' } }, { status: 404 })
      : eventStream(responseFrames('deepseek-v4-pro', { textParts: ['已知型号仍可回答。'] })),
  })
  const listed = await host.adapter.listModels('apophiscode')
  assert.deepEqual(listed.map(model => model.id), ['deepseek-v4-pro', unknown])
  const info = await Promise.all(listed.map(model => host.adapter.resolveModel('apophiscode', model.id)))
  assert.deepEqual(info[1], { provider: 'apophiscode', id: unknown, name: unknown })
  assert.equal(info[1].context, undefined)
  assert.equal((await host.rpc('models/status')).value.models[1].unavailableReason, undefined)
  await host.adapter.prepareCall('apophiscode', unknown)
  assert.equal(host.requests.length, 0, 'the explicit family policy does not probe')
  const rejected = await host.turn({ model: unknown, prompt: 'fixture business content' })
  assert.equal(rejected.assembled.finish.kind, 'error')
  assert.match(rejected.assembled.finish.failure.message, /unknown model/u)
  assert.equal(host.requests.length, 1)
  assert.equal(new URL(host.requests[0].url).pathname, '/v1/responses')
  assert.equal(host.requests[0].body.stream, true)
  assert.ok(JSON.stringify(host.requests[0].body).includes('fixture business content'))
  const known = await host.turn({ model: 'deepseek-v4-pro', reasoningEffort: undefined })
  assert.equal(known.assembled.finish.kind, 'stop')
  assert.equal(textOf(known.assembled), '已知型号仍可回答。')
  assert.equal(host.requests.length, 2)
})

test('switching the active key replaces the directory rather than unioning enabled keys; refresh follows removals', async t => {
  let ids = [...IDS]
  const secondKey = 'sk-second-offline-key-only'
  const host = await createPluginHost(t, { applyPlugin: plugin.apply,
    modelIds: request => request.headers.get('authorization') === `Bearer ${secondKey}` ? ['deepseek-v4-pro'] : ids,
    respond: () => assert.fail('discovery must not send a model POST'),
  })
  const firstId = (await host.rpc('status')).value.activeId
  const second = await host.rpc('keys/add', { key: secondKey, label: 'second fixture' })
  const secondId = second.value.keys.find(entry => entry.id !== firstId).id
  await host.rpc('keys/select', { id: firstId })
  assert.deepEqual((await host.adapter.listModels('apophiscode')).map(model => model.id), IDS)
  await host.rpc('keys/select', { id: secondId })
  assert.deepEqual((await host.adapter.listModels('apophiscode')).map(model => model.id), ['deepseek-v4-pro'])
  assert.deepEqual((await host.rpc('models/status')).value.models.map(model => model.id), ['deepseek-v4-pro'])
  await host.rpc('keys/select', { id: firstId })
  ids = IDS.slice(0, -1)
  assert.equal((await host.rpc('groups', { force: true })).ok, true)
  assert.deepEqual((await host.adapter.listModels('apophiscode')).map(model => model.id), ids)
})

test('directory cache coalesces discovery and metadata lookups; forced refresh reads once', async t => {
  let reads = 0
  const host = await createPluginHost(t, { applyPlugin: plugin.apply,
    modelIds: () => { reads += 1; return IDS }, respond: () => assert.fail('no model POST'),
  })
  await Promise.all([host.adapter.listModels('apophiscode'), host.adapter.listModels('apophiscode'), host.rpc('models/status')])
  await Promise.all(IDS.map(id => host.adapter.resolveModel('apophiscode', id)))
  await host.adapter.prepareCall('apophiscode', IDS[0])
  assert.equal(reads, 1)
  await host.rpc('groups', { force: true })
  await host.adapter.listModels('apophiscode')
  assert.equal(reads, 2)
})

test('key model cache expires and invalidates without retaining an older directory', async () => {
  let now = 10, reads = 0
  const reader = plugin.createGroupReader({ listKeys: async () => [{ id: 'a', key: 'fixture-key' }],
    getHosts: () => ({ apiHost: 'https://offline.example', statusHost: 'https://offline.example' }),
    now: () => now, ttlMs: 100,
    fetchImpl: async url => url.endsWith('/v1/models')
      ? (reads += 1, Response.json({ data: [{ id: IDS[reads % IDS.length] }] }))
      : Response.json({ code: 0, data: { groups: [] } }),
  })
  await reader.availableModelIds()
  await reader.availableModelIds()
  assert.equal(reads, 1)
  now += 101
  assert.deepEqual([...await reader.availableModelIds()], [IDS[2]])
  assert.equal(reads, 2)
  reader.invalidate()
  await reader.availableModelIds()
  assert.equal(reads, 3)
})

test('DeepSeek Pro refuses unsupported low effort before any model POST', async t => {
  const host = await createPluginHost(t, { applyPlugin: plugin.apply, modelIds: IDS,
    respond: () => assert.fail('unsupported effort must not send a model POST'),
  })
  await assert.rejects(host.turn({ model: 'deepseek-v4-pro', reasoningEffort: 'low' }), error => error.code === 'UNSUPPORTED_REASONING_EFFORT')
  assert.equal(host.requests.length, 0)
})

for (const olderId of ['deepseek-v4-flash', 'deepseek-future-unknown']) {
  for (const first of ['older', 'newer']) {
    test(`concurrent discovery retains each call's directory when ${first} finishes first (${olderId})`, async () => {
      let finishOlder, finishNewer, entered, reads = 0
      const directoriesEntered = new Promise(resolve => { entered = resolve })
      const ring = { activeKey: async () => ({ id: 'fixture-current', key: 'sk-offline-concurrency-fixture' }) }
      const adapter = plugin.createRouteAdapter({ ring, keys: {}, availableModelIds: () => ++reads === 1
        ? new Promise(resolve => { finishOlder = resolve }) : new Promise(resolve => { finishNewer = resolve; entered() }) })
      const older = adapter.listModels('apophiscode'), newer = adapter.listModels('apophiscode')
      await directoriesEntered
      if (first === 'newer') finishNewer(new Set(['deepseek-v4-pro']))
      else finishOlder(new Set([olderId]))
      if (first === 'newer') { finishOlder(new Set([olderId])); await older }
      else { finishNewer(new Set(['deepseek-v4-pro'])); await newer }
      assert.deepEqual((await older).map(model => model.id), [olderId])
      assert.deepEqual((await newer).map(model => model.id), ['deepseek-v4-pro'])
      assert.deepEqual(await adapter.listModels('other-provider'), [])
    })
  }
}

for (const disabled of [false, true]) {
  test(`cross-record key reflection rejects the entire model response (other key disabled=${disabled})`, async () => {
    const keys = [{ id: 'a', key: 'sk-offline-active-AAAA' }, { id: 'b', key: 'sk-offline-other-BBBB', disabled }]
    const reader = plugin.createGroupReader({ listKeys: async () => keys, getActiveKey: async () => keys[0],
      getHosts: () => ({ apiHost: 'https://offline.example', statusHost: 'https://offline.example' }),
      fetchImpl: async (url, init) => Response.json(url.endsWith('/api/v1/model-plaza')
        ? { code: 0, data: { groups: [] } }
        : { data: [{ id: init.headers.Authorization.endsWith(keys[0].key) ? `model-${keys[1].key}` : 'deepseek-v4-pro' }] }),
    })
    const rpc = plugin.createApophisCodeRpc({ groups: reader })
    const reply = await rpc('groups')
    assert.equal(reply.ok, true)
    const rejected = reply.value.keys.find(entry => entry.id === 'a')
    assert.match(rejected.error, /unsafe model-list/u)
    assert.equal(rejected.modelIds, undefined)
    assert.deepEqual(rejected.coverage, {})
    for (const entry of keys) assert.equal(JSON.stringify(reply).includes(entry.key), false)
    await assert.rejects(reader.availableModelIds(), /model list is unavailable/u)
    assert.deepEqual(reader.snapshot().keys.find(entry => entry.id === 'a').coverage, {})
  })
}

test('cached raw model projections are checked against newly stored plugin credentials', async () => {
  const other = { id: 'b', key: 'sk-offline-newly-stored-BBBB', disabled: true }
  const keys = [{ id: 'a', key: 'sk-offline-active-AAAA' }]
  const reader = plugin.createGroupReader({ listKeys: async () => keys, getActiveKey: async () => keys[0],
    getHosts: () => ({ apiHost: 'https://offline.example', statusHost: 'https://offline.example' }),
    fetchImpl: async url => Response.json(url.endsWith('/api/v1/model-plaza')
      ? { code: 0, data: { groups: [] } } : { data: [{ id: `model-${other.key}` }] }),
  })
  await reader.read()
  await reader.availableModelIds()
  keys.push(other)
  await assert.rejects(reader.read(), /refused unsafe model-list data/u)
  await assert.rejects(reader.availableModelIds(), /model list is unavailable/u)
})

for (const surface of ['discovery', 'groups']) {
  for (const removedId of ['active', 'other']) {
    test(`${surface} rejects reflection of a ${removedId} key removed while the model GET is pending`, async () => {
      const active = { id: 'active', key: 'sk-offline-deleted-active-AAAA' }
      const other = { id: 'other', key: 'sk-offline-deleted-other-BBBB', disabled: true }
      let keys = [active, other]
      const removed = keys.find(entry => entry.id === removedId)
      const reader = plugin.createGroupReader({ listKeys: async () => keys, getActiveKey: async () => active,
        getHosts: () => ({ apiHost: 'https://offline.example', statusHost: 'https://offline.example' }),
        fetchImpl: async url => {
          if (url.endsWith('/api/v1/model-plaza')) return Response.json({ code: 0, data: { groups: [] } })
          keys = keys.filter(entry => entry.id !== removedId)
          return Response.json({ data: [{ id: `model-${removed.key}` }] })
        },
      })
      if (surface === 'discovery') {
        await assert.rejects(reader.availableModelIds(), /model list is unavailable/u)
      } else {
        const reply = await plugin.createApophisCodeRpc({ groups: reader })('groups')
        assert.equal(reply.ok, true)
        assert.ok(reply.value.keys.every(entry => entry.modelIds === undefined && Object.keys(entry.coverage).length === 0))
        assert.ok(reply.value.keys.every(entry => /unsafe model-list/u.test(entry.error)))
        for (const entry of [active, other]) assert.equal(JSON.stringify(reply).includes(entry.key), false)
        assert.equal(JSON.stringify(reader.snapshot()).includes(removed.key), false)
      }
    })
  }
}
