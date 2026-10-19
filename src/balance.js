/**
 * Per-key usage through the explicitly configured status target.
 * The public Apophis key-usage page reads `/v1/usage` with a Bearer API key.
 * Amounts are already USD; wallet and subscription periods stay separate.
 * Credentials and raw response bodies remain host-side.
 * @module dsh-apophiscode-api/balance
 */

import { createCachedRead } from './cached-read.js'
import {
  DEFAULT_BALANCE_TTL_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from './constants.js'
import { statusHostOrder } from './hosts.js'
import { ambientFetch, boundedFetch } from './request.js'
import { redactSecrets } from './secret-redactor.js'

export { statusHostOrder } from './hosts.js'

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function number(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

/**
 * Normalize the root object from `/v1/usage`, following the deployed public UI.
 * A quota-limited key reports its own limit, used and remaining. Other modes
 * may report a wallet/remaining figure, but their usage costs and subscription
 * limits are different quantities and must not become a made-up total.
 * @param payload - the endpoint's bare payload; legacy wrapped data is rejected.
 * @returns a small projection, or undefined when the shape is unrecognized.
 */
export function parseTokenUsage(payload) {
  const data = payload
  if (!record(data) || data.error !== undefined) return undefined
  if (data.unit !== undefined && data.unit !== 'USD') return undefined
  const quota = data.mode === 'quota_limited' ? data.quota : undefined
  if (data.mode === 'quota_limited' && (!record(quota) || (quota.unit !== undefined && quota.unit !== 'USD'))) return undefined
  const availableUsd = number(quota === undefined ? data.remaining ?? data.balance : quota.remaining)
  if (availableUsd === undefined) return undefined
  const limitUsd = quota === undefined ? undefined : number(quota.limit)
  const usedUsd = quota === undefined ? undefined : number(quota.used)
  if (quota !== undefined && (limitUsd === undefined || limitUsd < 0 || usedUsd === undefined || usedUsd < 0)) return undefined
  return {
    availableUsd,
    ...(quota === undefined ? {} : { limitUsd, usedUsd }),
    ...(typeof data.planName === 'string' && data.planName !== '' ? { name: data.planName } : {}),
    ...(typeof data.status === 'string' && data.status !== '' ? { status: data.status } : {}),
    ...(typeof data.isValid === 'boolean' ? { valid: data.isValid } : {}),
  }
}

function statusMessage(status) {
  if (status === 401) return 'this API key was rejected (401)'
  if (status === 402 || status === 403) return 'the gateway refused this key\'s balance read (402/403)'
  if (status === 429) return 'the gateway is rate limiting balance reads (429)'
  return `the gateway answered HTTP ${status}`
}

async function getJson(url, key, { fetchImpl, timeoutMs, signal }) {
  let response
  try {
    response = await boundedFetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } }, { fetchImpl, timeoutMs, signal })
  } catch (error) {
    if (error.aborted) throw error.cause
    throw new Error(error.message, { cause: error })
  }
  if (!response.ok) throw new Error(statusMessage(response.status))
  try { return await response.json() }
  catch { throw new Error('the gateway returned unreadable balance data') }
}

/**
 * Cached, single-flight balance reader.
 *
 * A read that fails for one key — the gateway throttled it, a host was
 * unreachable — keeps showing the last balance that key did report, marked
 * `stale` with when it was read and why this read failed, instead of blanking
 * the row. These last-good values live in the host process: a page refresh
 * keeps them, a restart does not.
 * @param options - key listing, host resolution, and transport knobs.
 * @returns `{ read({force, signal}), invalidate() }`.
 */
export function createBalanceReader({
  listKeys,
  getHosts,
  fetchImpl = ambientFetch,
  now = Date.now,
  ttlMs = DEFAULT_BALANCE_TTL_MS,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof listKeys !== 'function') throw new Error('ApophisCode balance reader requires listKeys')
  if (typeof getHosts !== 'function') throw new Error('ApophisCode balance reader requires getHosts')
  /** Last successful per-key usage, by key id. */
  const lastGood = new Map()

  const loadKey = async (entry, hosts, signal) => {
    const payload = await getJson(`${statusHostOrder(hosts)[0]}/v1/usage`, entry.key, { fetchImpl, timeoutMs, signal })
    const usage = parseTokenUsage(payload)
    if (usage === undefined) throw new Error('the gateway returned an unrecognized usage payload')
    return usage
  }

  const load = async signal => {
    signal?.throwIfAborted()
    const hosts = getHosts()
    const keys = await listKeys()
    const secrets = keys.map(entry => entry.key)
    const safe = value => redactSecrets(value, secrets)
    // A removed key's last balance must not resurface under a later key.
    for (const id of lastGood.keys()) {
      if (!keys.some(entry => entry.id === id)) lastGood.delete(id)
    }
    const entries = []
    for (const entry of keys) {
      const base = { id: entry.id, label: safe(entry.label), disabled: entry.disabled === true }
      try {
        const usage = await loadKey(entry, hosts, signal)
        if (usage.name !== undefined) usage.name = safe(usage.name)
        if (usage.status !== undefined) usage.status = safe(usage.status)
        lastGood.set(entry.id, { usage, host: statusHostOrder(hosts)[0], fetchedAt: now() })
        entries.push({ ...base, usage })
      } catch (error) {
        signal?.throwIfAborted()
        const message = safe(error instanceof Error ? error.message : String(error))
        const stored = lastGood.get(entry.id)
        const previous = stored?.host === statusHostOrder(hosts)[0] ? stored : undefined
        entries.push(previous === undefined
          ? { ...base, error: message }
          : { ...base, usage: previous.usage, stale: { fetchedAt: previous.fetchedAt, error: message } })
      }
    }
    return { keys: entries, hosts, fetchedAt: now() }
  }

  const cache = createCachedRead(load, { ttlMs, now })
  return Object.freeze({
    read: options => cache.read(options),
    invalidate: () => cache.invalidate(),
  })
}
