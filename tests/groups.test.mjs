import assert from 'node:assert/strict'
import test from 'node:test'

import { catalogCoverage, createGroupReader, parseKeyModels, parseModelPlaza, pickKeyForModel } from '../src/groups.js'

/** Offline fixture following the publicly readable Apophis model-plaza schema. */
const PLAZA = { code: 0, data: { groups: [
  { id: 1, name: 'codex - 福利分组', description: '中文公开说明', models: [{ name: 'gpt-6.1-sol' }] },
  { id: 2, name: 'claude - 满血Max', models: [{ name: 'claude-opus-5-5' }, { name: 'claude-sonnet-5-5' }] },
  { id: 3, name: 'claude - 满血Max', models: [{ name: 'claude-opus-5-5' }, { name: 'outside-catalog' }] },
] } }
const KEYS = [
  { id: 'a', label: 'codex key', key: 'sk-codex-key-AAAA' },
  { id: 'b', label: 'claude key', key: 'sk-claude-key-BBBB' },
]
const HOSTS = { apiHost: 'https://api.example', statusHost: 'https://status.example' }
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

function gateway({ modelsByKey = {}, plaza = PLAZA, failed = {}, directoryStatus = () => 200 } = {}) {
  const calls = []
  return { calls, fetchImpl: async (url, init) => {
    const key = init.headers.Authorization?.replace(/^Bearer /u, '')
    calls.push({ url, key, init })
    assert.equal(init.method ?? 'GET', 'GET', 'settings reads never send model probes')
    assert.equal(init.redirect, 'error')
    if (url.endsWith('/api/v1/model-plaza')) {
      assert.equal(key, undefined, 'public metadata never receives the model key')
      return json(directoryStatus(), plaza)
    }
    assert.ok(url.endsWith('/v1/models'))
    if (failed[key]) throw new Error(failed[key])
    const models = modelsByKey[key]
    if (models === 'rejected') return json(401, {})
    return json(200, models ?? { data: [] })
  } }
}

test('public group identity preserves numeric IDs and Unicode names without membership inference', () => {
  const directory = parseModelPlaza(PLAZA)
  assert.deepEqual(directory.modelGroups['claude-opus-5-5'], ['2', '3'])
  assert.equal(directory.descriptions['1'], 'codex - 福利分组: 中文公开说明')
  assert.deepEqual(directory.groups.map(group => group.name), ['codex - 福利分组', 'claude - 满血Max', 'claude - 满血Max'])
  assert.equal(directory.modelGroups['outside-catalog'], undefined)
  assert.equal(parseModelPlaza({ data: [] }), undefined)
  assert.equal(parseModelPlaza({ code: 1, data: { groups: [] } }), undefined)
  assert.equal(parseModelPlaza({ code: 0, data: { groups: [{ id: '中文名', name: 'bad', models: [] }] } }), undefined)
  assert.deepEqual(catalogCoverage({ groups: ['1'], modelGroups: directory.modelGroups }), {})
})

test('key model discovery accepts data and models arrays, rejecting malformed success bodies', () => {
  assert.deepEqual([...parseKeyModels({ data: [{ id: 'gpt-6.1-sol' }] })], ['gpt-6.1-sol'])
  assert.deepEqual([...parseKeyModels({ models: [{ id: 'claude-opus-5-5' }] })], ['claude-opus-5-5'])
  assert.deepEqual([...parseKeyModels({ data: [] })], [])
  for (const payload of [{}, { data: [{ name: 'model' }] }, { models: [null] }, { data: [], error: { message: 'denied' } }]) assert.equal(parseKeyModels(payload), undefined)
})

test('each key supplies coverage through authenticated GETs; public groups never become key groups', async () => {
  const net = gateway({ modelsByKey: {
    [KEYS[0].key]: { data: [{ id: 'gpt-6.1-sol' }] },
    [KEYS[1].key]: { models: [{ id: 'claude-opus-5-5' }] },
  } })
  let clock = 1000
  const reader = createGroupReader({ listKeys: async () => KEYS, getHosts: () => HOSTS, fetchImpl: net.fetchImpl, now: () => clock })
  const value = await reader.read()
  assert.equal(JSON.stringify(value).includes('sk-'), false)
  assert.deepEqual(value.keys.map(key => key.groups), [undefined, undefined])
  assert.ok(value.keys.every(key => key.membershipUnavailable === true))
  assert.equal(reader.groupsOf('b'), undefined)
  assert.equal(reader.covers('a', 'gpt-6.1-sol'), true)
  assert.equal(reader.covers('a', 'claude-opus-5-5'), false)
  assert.equal(reader.covers('b', 'claude-opus-5-5'), true)
  assert.deepEqual(reader.requiredGroups('claude-opus-5-5'), ['2', '3'])
  assert.ok(net.calls.filter(call => call.key).every(call => call.url.startsWith('https://api.example/')))
  assert.ok(net.calls.filter(call => !call.key).every(call => call.url.startsWith('https://status.example/')))
  assert.equal(net.calls.length, 3)
  await reader.read()
  assert.equal(net.calls.length, 3)
  clock += 11 * 60_000
  await reader.read()
  assert.equal(net.calls.length, 6)
  reader.invalidate()
  assert.equal(reader.snapshot(), undefined)
})

test('directory outages are visible with stale markers and cannot override key coverage', async () => {
  let status = 200
  const net = gateway({ directoryStatus: () => status, modelsByKey: { [KEYS[0].key]: { data: [{ id: 'deepseek-v4.1-flash' }] } } })
  const reader = createGroupReader({ listKeys: async () => [KEYS[0]], getHosts: () => HOSTS, fetchImpl: net.fetchImpl, now: () => 1234 })
  await reader.read()
  status = 404
  const stale = await reader.read({ force: true })
  assert.equal(stale.directoryStale.fetchedAt, 1234)
  assert.match(stale.directoryStale.error, /HTTP 404/u)
  assert.equal(stale.keys[0].coverage['deepseek-v4.1-flash'], true)
  assert.ok(stale.publicGroups.length)
  const fresh = createGroupReader({ listKeys: async () => [KEYS[0]], getHosts: () => HOSTS, fetchImpl: net.fetchImpl })
  const failed = await fresh.read()
  assert.match(failed.directoryError, /HTTP 404/u)
  assert.deepEqual(failed.requirements, {})
  assert.equal(failed.keys[0].coverage['deepseek-v4.1-flash'], true)
})

test('unrecognized model lists stay unknown; rejections and stale key results stay distinct', async () => {
  const modelsByKey = { [KEYS[0].key]: { data: [{ id: 'gpt-6.1-sol' }] }, [KEYS[1].key]: 'rejected' }
  const failed = {}
  const net = gateway({ modelsByKey, failed })
  const reader = createGroupReader({ listKeys: async () => KEYS, getHosts: () => HOSTS, fetchImpl: net.fetchImpl })
  const first = await reader.read()
  assert.equal(first.keys[1].rejected, true)
  assert.equal(reader.covers('b', 'deepseek-v4.1-flash'), false)
  failed[KEYS[0].key] = `fetch failed with ${KEYS[0].key}`
  const second = await reader.read({ force: true })
  assert.equal(second.keys[0].coverage['gpt-6.1-sol'], true)
  assert.match(second.keys[0].stale.error, /fetch failed/u)
  assert.equal(JSON.stringify(second).includes(KEYS[0].key), false)
  delete failed[KEYS[0].key]
  modelsByKey[KEYS[1].key] = { unknown: true }
  const third = await reader.read({ force: true })
  assert.deepEqual(third.keys[1].coverage, {})
  assert.equal(reader.covers('b', 'deepseek-v4.1-flash'), undefined)
  assert.match(third.keys[1].error, /unrecognized model list/u)
})

test('changed targets do not inherit old successful metadata or permissions', async () => {
  let hosts = HOSTS, failing = false
  const net = gateway({ modelsByKey: { [KEYS[0].key]: { data: [{ id: 'gpt-6.1-sol' }] } } })
  const reader = createGroupReader({ listKeys: async () => [KEYS[0]], getHosts: () => hosts,
    fetchImpl: (...args) => { if (failing) throw new Error('unavailable'); return net.fetchImpl(...args) },
  })
  await reader.read()
  hosts = { apiHost: 'https://new-api.example', statusHost: 'https://new-status.example' }
  failing = true
  const changed = await reader.read({ force: true })
  assert.deepEqual(changed.requirements, {})
  assert.ok(changed.directoryError)
  assert.deepEqual(changed.keys[0].coverage, {})
  assert.equal(changed.keys[0].stale, undefined)
})

test('keys are read concurrently in ring order and malformed JSON never leaks parser text', async () => {
  let inFlight = 0, peak = 0
  const reader = createGroupReader({ listKeys: async () => KEYS, getHosts: () => HOSTS,
    fetchImpl: async (url, init) => {
      if (url.endsWith('/api/v1/model-plaza')) return json(200, PLAZA)
      inFlight += 1; peak = Math.max(peak, inFlight)
      await new Promise(resolve => setTimeout(resolve, 10))
      inFlight -= 1
      if (init.headers.Authorization.endsWith(KEYS[0].key)) return json(200, { data: [{ id: 'gpt-6.1-sol' }] })
      return { ok: true, json: async () => { throw new Error(KEYS[1].key) } }
    },
  })
  const value = await reader.read()
  assert.equal(peak, 2)
  assert.deepEqual(value.keys.map(key => key.id), ['a', 'b'])
  assert.match(value.keys[1].error, /unreadable model-list/u)
  assert.equal(JSON.stringify(value).includes(KEYS[1].key), false)
})

test('directory and authenticated model URLs remove protocol suffixes but retain gateway prefixes', async () => {
  const net = gateway({ modelsByKey: { [KEYS[0].key]: { data: [] } } })
  const reader = createGroupReader({ listKeys: async () => [KEYS[0]],
    getHosts: () => ({ apiHost: 'https://api.example/tenant/v1', statusHost: 'https://status.example/tenant/v1beta/' }),
    fetchImpl: net.fetchImpl,
  })
  await reader.read()
  assert.deepEqual(net.calls.map(call => call.url).sort(), [
    'https://api.example/tenant/v1/models', 'https://status.example/tenant/api/v1/model-plaza',
  ])
})

test('a key is passed over only on evidence, and the active pointer is never moved', () => {
  const usable = [
    { id: 'a', label: 'A', key: 'ka' },
    { id: 'b', label: 'B', key: 'kb' },
    { id: 'c', label: 'C', key: 'kc' },
  ]
  const evidence = { 'a:claude': false, 'b:claude': undefined, 'c:claude': true, 'a:gpt': true }
  const covers = (id, model) => evidence[`${id}:${model}`]
  // The active key serves what it is not known to be excluded from.
  assert.deepEqual(pickKeyForModel('gpt', usable[0], usable, covers), usable[0])
  assert.deepEqual(pickKeyForModel('unknown', usable[0], usable, covers), usable[0])
  // Known excluded: the next key that surely can, ahead of one that may.
  assert.deepEqual(pickKeyForModel('claude', usable[0], usable, covers), { id: 'c', label: 'C', key: 'kc', switchedFrom: { id: 'a', label: 'A' } })
  // With no sure key, one with no evidence either way.
  evidence['c:claude'] = false
  assert.equal(pickKeyForModel('claude', usable[0], usable, covers).id, 'b')
  // With nothing better, the active key, marked uncovered.
  evidence['b:claude'] = false
  assert.deepEqual(pickKeyForModel('claude', usable[0], usable, covers), { ...usable[0], uncovered: true })
  // Ring order starts after the active key.
  evidence['a:claude'] = true
  evidence['c:claude'] = true
  assert.equal(pickKeyForModel('claude', usable[1], usable, covers).id, 'c')
  assert.equal(pickKeyForModel('claude', undefined, usable, covers), undefined)
})
