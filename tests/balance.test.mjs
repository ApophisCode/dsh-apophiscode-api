import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createBalanceReader,
  parseTokenUsage,
  statusHostOrder,
} from '../src/balance.js'

/** Offline projection of the shape consumed by Apophis' public KeyUsage page. */
const TOKEN_USAGE = {
  mode: 'quota_limited', planName: 'Apophis quota', status: 'active', isValid: true,
  quota: { limit: 500, used: 0.747116, remaining: 499.252884 },
}

test('parses explicit quota amounts as USD without legacy quota conversion', () => {
  const usage = parseTokenUsage(TOKEN_USAGE)
  assert.equal(usage.name, 'Apophis quota')
  assert.equal(usage.limitUsd, 500)
  assert.equal(usage.availableUsd, 499.252884)
  assert.equal(usage.usedUsd, 0.747116)
  assert.equal(usage.valid, true)
  assert.equal(usage.status, 'active')
  assert.equal('unlimitedQuota' in usage, false)
})

test('wallet and subscription figures stay separate; missing validity stays unknown', () => {
  const usage = parseTokenUsage({ mode: 'balance', balance: 9.5, remaining: '8.5', subscription: { daily_limit_usd: 20, daily_usage_usd: 1 }, usage: { total: { actual_cost: 100 } } })
  assert.deepEqual(usage, { availableUsd: 8.5 })
  assert.deepEqual(parseTokenUsage({ balance: 9.5, isValid: false, status: 'expired' }), { availableUsd: 9.5, valid: false, status: 'expired' })
})

test('unknown, legacy, unsupported-unit and malformed payloads do not become balances', () => {
  for (const payload of [
    { nothing: true }, { mode: 'unknown', subscription: {} },
    { data: { total_available: 500000, unlimited_quota: true } },
    { balance: 12, unit: 'CNY' }, { balance: 'NaN' },
    { mode: 'quota_limited', balance: 12 },
    { mode: 'quota_limited', quota: { remaining: 10, used: 0, limit: -1 } },
    { mode: 'quota_limited', quota: { remaining: 10, used: 0, limit: 10, unit: 'tokens' } },
  ]) assert.equal(parseTokenUsage(payload), undefined)
})

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }
}

function routedFetch(routes) {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push(url)
    const route = routes.find(candidate => url.startsWith(candidate.prefix))
    if (route === undefined) throw new Error(`unrouted ${url}`)
    if (typeof route.reply === 'function') return route.reply(url, options)
    return jsonResponse(route.reply, route.status ?? 200)
  }
  return { fetchImpl, calls }
}

const KEYS = [{ id: 'a', label: 'primary', key: 'sk-aaaaaaaaaaaaaaaa', disabled: false }]
const HOSTS = { apiHost: 'https://www.apophis.uk', statusHost: 'https://www.apophis.uk' }

test('a balance read requests only per-key usage, never the billing family', async () => {
  // Only the documented per-key usage endpoint is requested; no account session or billing fallback.
  const requests = []
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => HOSTS,
    fetchImpl: async (url, init) => {
      requests.push(url)
      assert.equal(new URL(url).pathname, '/v1/usage')
      assert.equal(init.redirect, 'error')
      assert.ok(init.signal instanceof AbortSignal)
      return jsonResponse(TOKEN_USAGE)
    },
  })
  const value = await reader.read()
  assert.equal(value.keys[0].usage.availableUsd, 499.252884)
  assert.equal(Object.hasOwn(value, 'account'), false)
  assert.equal(requests.length, 1)
  assert.match(requests[0], /^https:\/\/www\.apophis\.uk/u)
  await reader.read()
  assert.equal(requests.length, 1)
  await reader.read({ force: true })
  assert.equal(requests.length, 2)
})

test('a read without keys makes no authenticated request', async () => {
  const reader = createBalanceReader({ listKeys: async () => [], getHosts: () => HOSTS,
    fetchImpl: async () => { assert.fail('must not fall back to another credential') },
  })
  const value = await reader.read()
  assert.deepEqual(value.keys, [])
  assert.equal(Object.hasOwn(value, 'account'), false)
})

test('quota projections redact credentials echoed in plan names, status and transport diagnostics', async () => {
  let failing = false
  const key = KEYS[0].key
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => HOSTS,
    fetchImpl: async () => {
      if (failing) throw new Error(`connection failed with Bearer ${key}`)
      return jsonResponse({ balance: 1, planName: `image account ${key}`, status: key })
    },
  })
  const first = await reader.read()
  assert.equal(JSON.stringify(first).includes(key), false)
  assert.match(first.keys[0].usage.name, /\[redacted\]/u)
  failing = true
  const stale = await reader.read({ force: true })
  assert.equal(stale.keys[0].usage.availableUsd, 1)
  assert.ok(stale.keys[0].stale)
  assert.equal(JSON.stringify(stale).includes(key), false)
})

test('an invalid JSON balance response never exposes a secret from its parse error', async () => {
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => HOSTS,
    fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError(`invalid JSON near ${KEYS[0].key}`) } }),
  })
  const value = await reader.read()
  assert.match(value.keys[0].error, /unreadable balance data/u)
  assert.equal(JSON.stringify(value).includes(KEYS[0].key), false)
})

test('a failed configured status target never retries another host with the key', async () => {
  const calls = []
  const reader = createBalanceReader({
    listKeys: async () => KEYS,
    getHosts: () => ({ apiHost: 'https://models.example', statusHost: 'https://status.example' }),
    fetchImpl: async (url, init) => {
      calls.push(url)
      assert.equal(init.headers.Authorization, `Bearer ${KEYS[0].key}`)
      return jsonResponse({ error: 'not found' }, 404)
    },
  })
  const value = await reader.read()
  assert.match(value.keys[0].error, /HTTP 404/u)
  assert.equal(value.keys[0].usage, undefined)
  assert.deepEqual(calls, ['https://status.example/v1/usage'])
})

test('a rejected key reports its own error without failing the whole read', async () => {
  const { fetchImpl } = routedFetch([
    { prefix: 'https://www.apophis.uk/v1/usage', reply: { error: { message: '无效的令牌' } }, status: 401 },
    { prefix: 'https://www.apophis.uk/v1/usage', reply: { error: { message: '无效的令牌' } }, status: 401 },
  ])
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => HOSTS, fetchImpl })
  const value = await reader.read()
  assert.equal(value.keys[0].usage, undefined)
  assert.match(value.keys[0].error, /rejected \(401\)/u)
})

test('each key reports with its own credential, so a rejected key leaves the others intact', async () => {
  const keys = [
    { id: 'bad', label: 'bad', key: 'sk-invalid-000000', disabled: false },
    { id: 'good', label: 'good', key: 'sk-valid-000000', disabled: false },
  ]
  const isBad = options => String(options.headers.Authorization).includes('sk-invalid')
  const { fetchImpl } = routedFetch([
    {
      prefix: 'https://www.apophis.uk/v1/usage',
      reply: (_url, options) => (isBad(options) ? jsonResponse({ error: { message: '无效的令牌' } }, 401) : jsonResponse(TOKEN_USAGE)),
    },
    { prefix: 'https://legacy-gateway.invalid/v1/usage', reply: { error: { message: '无效的令牌' } }, status: 401 },
    { prefix: 'https://www.apophis.uk/v1/usage', reply: { error: 'not found' }, status: 404 },
  ])
  const reader = createBalanceReader({ listKeys: async () => keys, getHosts: () => HOSTS, fetchImpl })
  const value = await reader.read()
  assert.match(value.keys[0].error, /rejected \(401\)/u)
  assert.equal(value.keys[1].usage.availableUsd, 499.252884)
  assert.equal(value.keys[1].error, undefined)
})

test('caches a read, shares one in flight, and forgets on invalidate', async () => {
  let calls = 0
  const { fetchImpl } = routedFetch([
    {
      prefix: 'https://www.apophis.uk/v1/usage',
      reply: () => {
        calls += 1
        return jsonResponse(TOKEN_USAGE)
      },
    },
  ])
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => HOSTS, fetchImpl, now: () => 1000 })
  const [first, second] = await Promise.all([reader.read(), reader.read()])
  assert.equal(calls, 1)
  assert.equal(first.fetchedAt, second.fetchedAt)
  await reader.read()
  assert.equal(calls, 1)
  reader.invalidate()
  await reader.read()
  assert.equal(calls, 2)
})

test('status destination is the configured target or the Apophis default only', () => {
  assert.deepEqual(statusHostOrder(), ['https://www.apophis.uk'])
  assert.deepEqual(statusHostOrder({ apiHost: 'https://models.example', statusHost: 'https://status.example/' }), ['https://status.example'])
})

test('usage URL accepts protocol suffixes and preserves an explicit gateway path', async () => {
  const calls = []
  for (const suffix of ['', '/v1', '/v1beta/']) {
    const reader = createBalanceReader({ listKeys: async () => KEYS,
      getHosts: () => ({ statusHost: `https://status.example/gateway${suffix}` }),
      fetchImpl: async url => { calls.push(url); return jsonResponse(TOKEN_USAGE) },
    })
    assert.equal((await reader.read()).keys[0].usage.limitUsd, 500)
  }
  assert.deepEqual(calls, Array(3).fill('https://status.example/gateway/v1/usage'))
})

test('an unreachable status target reports its transport cause without retrying another host', async () => {
  const calls = []
  const dnsFailure = Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('getaddrinfo ENOTFOUND status.example'), { code: 'ENOTFOUND' }) })
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => HOSTS,
    fetchImpl: async url => { calls.push(url); throw dnsFailure },
  })
  const value = await reader.read()
  assert.match(value.keys[0].error, /fetch failed \(ENOTFOUND\)/u)
  assert.deepEqual(calls, ['https://www.apophis.uk/v1/usage'])
})

test('a failed read keeps the last balance each key reported, marked stale', async () => {
  let up = true
  let clock = 1_000
  const { fetchImpl } = routedFetch([
    {
      prefix: 'https://www.apophis.uk/v1/usage',
      reply: () => (up ? jsonResponse(TOKEN_USAGE) : jsonResponse({ error: 'busy' }, 429)),
    },
    { prefix: 'https://legacy-gateway.invalid/v1/usage', reply: () => jsonResponse({ error: 'busy' }, 429) },
    { prefix: 'https://www.apophis.uk/v1/usage', reply: { error: 'not found' }, status: 404 },
  ])
  let keys = KEYS
  const reader = createBalanceReader({ listKeys: async () => keys, getHosts: () => HOSTS, fetchImpl, now: () => clock })
  const first = await reader.read()
  assert.equal(first.keys[0].stale, undefined)

  up = false
  clock = 99_000
  const second = await reader.read({ force: true })
  assert.equal(second.keys[0].usage.availableUsd, 499.252884, 'the last good balance stays visible')
  assert.equal(second.keys[0].stale.fetchedAt, 1_000)
  assert.match(second.keys[0].stale.error, /429/u)
  assert.equal(second.keys[0].error, undefined)

  // A key that is no longer stored takes its last balance with it.
  keys = [{ id: 'b', label: 'other', key: 'sk-bbbbbbbbbbbbbbbb', disabled: false }]
  const third = await reader.read({ force: true })
  assert.equal(third.keys[0].usage, undefined)
  assert.equal(third.keys[0].stale, undefined)
  assert.ok(third.keys[0].error)
})

test('unknown successful responses report errors and an old host balance cannot cross a target change', async () => {
  let hosts = HOSTS
  let payload = TOKEN_USAGE
  const reader = createBalanceReader({ listKeys: async () => KEYS, getHosts: () => hosts,
    fetchImpl: async () => jsonResponse(payload),
  })
  await reader.read()
  payload = { mode: 'unknown', subscription: {} }
  const stale = await reader.read({ force: true })
  assert.ok(stale.keys[0].stale)
  assert.match(stale.keys[0].stale.error, /unrecognized usage/u)
  hosts = { ...HOSTS, statusHost: 'https://other.example' }
  const changed = await reader.read({ force: true })
  assert.equal(changed.keys[0].usage, undefined)
  assert.equal(changed.keys[0].stale, undefined)
  assert.match(changed.keys[0].error, /unrecognized usage/u)
})
