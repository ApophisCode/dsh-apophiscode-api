/**
 * Read-only model coverage and public group descriptions for ApophisCode.
 * `/v1/models` is authenticated by each stored key. The public model plaza
 * describes the whole service, never that key's membership or permissions.
 * No artificial model POST or legacy group-name policy is used here.
 * @module dsh-apophiscode-api/groups
 */

import { createCachedRead } from './cached-read.js'
import { createHash } from 'node:crypto'
import { declaredMetadata } from './catalog.js'
import { DEFAULT_REQUEST_TIMEOUT_MS } from './constants.js'
import { apiRootHost, statusHostOrder } from './hosts.js'
import { ambientFetch, boundedFetch } from './request.js'
import { redactSecrets } from './secret-redactor.js'

export const DEFAULT_GROUP_TTL_MS = 10 * 60_000
const KEY_CONCURRENCY = 4
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const cleanText = (value, maximum) => typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, maximum) : ''
const unsafeModels = (ids, secrets) => ids?.some(id => secrets.some(key => id.includes(key))) === true

async function mapLimited(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

class RejectedKeyError extends Error {
  constructor() { super('the gateway rejected this key (401)') }
}

/** Normalize public group IDs separately from their Unicode display names. */
export function parseModelPlaza(payload) {
  if (!record(payload) || payload.code !== 0 || !Array.isArray(payload.data?.groups)) return undefined
  const modelGroups = Object.create(null), descriptions = {}, groups = []
  for (const item of payload.data.groups) {
    if (!record(item) || !Number.isSafeInteger(item.id) || item.id < 0 || !Array.isArray(item.models)) return undefined
    const name = cleanText(item.name, 120)
    if (name === '' || groups.some(group => group.id === item.id)) return undefined
    const id = String(item.id)
    const description = cleanText(item.description, 240)
    groups.push({ id: item.id, name, ...(description === '' ? {} : { description }) })
    descriptions[id] = description === '' ? name : `${name}: ${description}`
    for (const model of item.models) {
      if (!record(model) || typeof model.name !== 'string') return undefined
      const enabled = modelGroups[model.name] ??= []
      if (!enabled.includes(id)) enabled.push(id)
    }
  }
  return { modelGroups: { ...modelGroups }, descriptions, groups }
}

/** Recognize OpenAI and deployed Codex-style model lists, never an error body. */
export function parseKeyModels(payload) {
  if (!record(payload) || payload.error !== undefined) return undefined
  const items = Array.isArray(payload.data) ? payload.data : payload.models
  if (!Array.isArray(items) || items.some(item => !record(item) || typeof item.id !== 'string' || item.id.trim() === '')) return undefined
  return new Set(items.map(item => item.id))
}

/** Only this key's own model list supplies coverage evidence. */
export function catalogCoverage({ models } = {}) {
  return models === undefined ? {} : Object.fromEntries([...models].map(id => [id, true]))
}

/** Cached, bounded GETs. Public directory failures never discard key evidence. */
export function createGroupReader({
  listKeys, getActiveKey, getHosts, fetchImpl = ambientFetch, now = Date.now,
  ttlMs = DEFAULT_GROUP_TTL_MS, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof listKeys !== 'function') throw new Error('ApophisCode group reader requires listKeys')
  if (typeof getHosts !== 'function') throw new Error('ApophisCode group reader requires getHosts')
  const lastGood = new Map()
  let lastDirectory
  const request = (url, init, signal) => boundedFetch(url, init, { fetchImpl, timeoutMs, signal })

  const loadDirectory = async (host, signal) => {
    const response = await request(`${host}/api/v1/model-plaza`, { headers: { Accept: 'application/json' } }, signal)
    if (!response.ok) throw new Error(`public model directory answered HTTP ${response.status}`)
    let payload
    try { payload = await response.json() }
    catch { throw new Error('the gateway returned unreadable public model data') }
    const directory = parseModelPlaza(payload)
    if (directory === undefined) throw new Error('the gateway returned an unrecognized public model directory')
    return directory
  }

  const readKey = async (entry, apiHost, signal) => {
    // A key removed while the GET is pending still must not reach a public ID.
    const initialSecrets = [entry.key, ...(await listKeys()).map(item => item.key)]
    const response = await request(`${apiHost}/v1/models`, {
      headers: { Authorization: `Bearer ${entry.key}`, Accept: 'application/json' },
    }, signal)
    if (response.status === 401) throw new RejectedKeyError()
    if (!response.ok) throw new Error(`the key's model list answered HTTP ${response.status}`)
    let payload
    try { payload = await response.json() }
    catch { throw new Error('the gateway returned unreadable model-list data') }
    const models = parseKeyModels(payload)
    if (models === undefined) throw new Error('the gateway returned an unrecognized model list')
    const secrets = [...initialSecrets, ...(await listKeys()).map(item => item.key)]
    if (unsafeModels([...models], secrets)) throw new Error('the gateway returned unsafe model-list data')
    const rows = Array.isArray(payload.data) ? payload.data : payload.models
    // Only model metadata is retained here; this projection never returns an API key.
    return { id: entry.id, modelIds: [...models], modelRows: rows.map(row => {
      const metadata = declaredMetadata(row)
      return { id: row.id, api: metadata.api, contextWindow: metadata.contextWindow, maxTokens: metadata.maxTokens,
        input_modalities: metadata.input, reasoning_efforts: metadata.reasoningEfforts && Object.keys(metadata.reasoningEfforts),
        ...(Array.isArray(row.image_qualities) && row.image_qualities.every(value => typeof value === 'string' && value.length < 40 && !secrets.some(key => value.includes(key)))
          ? { image_qualities: row.image_qualities } : {}) }
    }), coverage: catalogCoverage({ models }), membershipUnavailable: true, fetchedAt: now() }
  }
  const keyCaches = new Map()
  const keyReader = (entry, apiHost) => {
    const identity = JSON.stringify([apiHost, entry.id, createHash('sha256').update(entry.key).digest('hex')])
    let reader = keyCaches.get(identity)
    if (reader === undefined) {
      reader = createCachedRead(signal => readKey(entry, apiHost, signal), { ttlMs, now })
      keyCaches.set(identity, reader)
    }
    return reader
  }

  const load = async signal => {
    signal?.throwIfAborted()
    const hosts = getHosts(), keys = await listKeys()
    const host = statusHostOrder(hosts)[0]
    const apiHost = apiRootHost(hosts.apiHost)
    const secrets = keys.map(entry => entry.key)
    const safe = value => redactSecrets(value, secrets)
    for (const id of lastGood.keys()) if (!keys.some(entry => entry.id === id)) lastGood.delete(id)
    // Directory metadata is public. It never authenticates with a model key.
    const directoryTask = loadDirectory(host, signal).then(directory => {
      const projected = {
        ...directory,
        descriptions: Object.fromEntries(Object.entries(directory.descriptions).map(([id, description]) => [id, safe(description)])),
        groups: directory.groups.map(group => ({ ...group, name: safe(group.name), ...(group.description === undefined ? {} : { description: safe(group.description) }) })),
      }
      lastDirectory = { value: projected, host, fetchedAt: now() }
      return { value: projected }
    }, error => {
      const message = safe(error instanceof Error ? error.message : String(error))
      return lastDirectory?.host === host
        ? { value: lastDirectory.value, stale: { fetchedAt: lastDirectory.fetchedAt, error: message } }
        : { error: message }
    })
    const entries = await mapLimited(keys, KEY_CONCURRENCY, async entry => {
      try {
        const value = await keyReader(entry, apiHost).read({ signal })
        lastGood.set(entry.id, { value, host: apiHost, fetchedAt: now() })
        return value
      } catch (error) {
        signal?.throwIfAborted()
        const message = safe(error instanceof Error ? error.message : String(error))
        if (error instanceof RejectedKeyError) {
          lastGood.delete(entry.id)
          return { id: entry.id, rejected: true, coverage: {}, error: message }
        }
        const previous = lastGood.get(entry.id)
        return previous?.host === apiHost && !unsafeModels(previous.value.modelIds, secrets)
          ? { ...previous.value, stale: { fetchedAt: previous.fetchedAt, error: message } }
          : { id: entry.id, coverage: {}, error: message }
      }
    })
    const directory = await directoryTask
    signal?.throwIfAborted()
    return {
      keys: entries, descriptions: directory.value?.descriptions ?? {},
      requirements: directory.value?.modelGroups ?? {},
      publicGroups: directory.value?.groups ?? [],
      ...(directory.error === undefined ? {} : { directoryError: directory.error }),
      ...(directory.stale === undefined ? {} : { directoryStale: directory.stale }),
      fetchedAt: now(),
    }
  }
  const cache = createCachedRead(load, { ttlMs, now })
  const keyEntry = keyId => cache.peek()?.keys.find(candidate => candidate.id === keyId)
  return Object.freeze({
    async read(options) {
      if (options?.force === true) keyCaches.clear()
      const reading = await cache.read(options)
      const secrets = (await listKeys()).map(entry => entry.key)
      if (reading.keys.some(entry => unsafeModels(entry.modelIds, secrets))) throw new Error('ApophisCode refused unsafe model-list data')
      return reading
    }, snapshot: () => cache.snapshot(),
    /** The active plugin key's raw IDs are the entire advertised directory. */
    async availableModels({ entry, apiHost: target, signal } = {}) {
      const active = entry ?? (getActiveKey === undefined ? (await listKeys()).find(item => item.disabled !== true) : await getActiveKey())
      if (active === undefined || active.disabled === true) return []
      const apiHost = apiRootHost(target ?? getHosts().apiHost)
      const value = await keyReader(active, apiHost).read({ signal })
      const secrets = (await listKeys()).map(item => item.key)
      if (unsafeModels(value.modelIds, secrets) || value.modelRows.some(row => row.image_qualities?.some(quality => secrets.some(key => quality.includes(key))))) {
        throw new Error('ApophisCode refused unsafe model-list data')
      }
      return value.modelRows
    },
    async availableModelIds() {
      const active = getActiveKey === undefined ? (await listKeys()).find(entry => entry.disabled !== true) : await getActiveKey()
      if (active === undefined || active.disabled === true) return new Set()
      const apiHost = apiRootHost(getHosts().apiHost)
      try {
        const ids = (await keyReader(active, apiHost).read()).modelIds
        const secrets = (await listKeys()).map(entry => entry.key)
        if (unsafeModels(ids, secrets)) throw new Error('unsafe model-list data')
        return new Set(ids)
      }
      catch { throw new Error('ApophisCode active key model list is unavailable: refresh the model list in settings') }
    },
    hasReading: () => cache.peek() !== undefined,
    covers(keyId, modelId) {
      const entry = keyEntry(keyId)
      const value = Array.isArray(entry?.modelIds) ? entry.modelIds.includes(modelId) : entry?.coverage?.[modelId]
      return typeof value === 'boolean' ? value : undefined
    },
    /** Public directory groups for a model; never proof of key membership. */
    requiredGroups(modelId) {
      const groups = cache.peek()?.requirements?.[modelId]
      return Array.isArray(groups) ? [...groups] : undefined
    },
    /** The deployed API does not expose verified current-key group membership. */
    groupsOf: () => undefined,
    invalidate() { cache.invalidate(); keyCaches.clear() },
  })
}

/** Choose another stored key only when the active key is known excluded. */
export function pickKeyForModel(modelId, active, usable, covers) {
  if (active === undefined) return undefined
  if (typeof modelId !== 'string' || covers(active.id, modelId) !== false) return { ...active }
  const start = usable.findIndex(entry => entry.id === active.id)
  const others = start < 0 ? usable.filter(entry => entry.id !== active.id) : [...usable.slice(start + 1), ...usable.slice(0, start)]
  const pick = others.find(entry => covers(entry.id, modelId) === true) ?? others.find(entry => covers(entry.id, modelId) === undefined)
  if (pick === undefined) return { ...active, uncovered: true }
  return { id: pick.id, label: pick.label, key: pick.key, switchedFrom: { id: active.id, label: active.label } }
}
