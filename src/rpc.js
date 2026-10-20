/**
 * The loopback RPC surface behind the settings panel and the composer chip.
 *
 * Every reply carries only what this plugin owns: key labels and state, the
 * balance and group projections the host built, host overrides, whether this
 * device has the Claude Code CLI and which transport Claude requests take, the
 * plugin version, web search preferences and model visibility, bounded
 * session-authorized original PNG chunks, or a numbers-only session
 * diagnosis. Key material never crosses this boundary.
 *
 * @module dsh-apophiscode-api/rpc
 */

import { DEFAULT_API_HOST, DEFAULT_STATUS_HOST } from './constants.js'
import { normalizeHost } from './hosts.js'

export { normalizeHost } from './hosts.js'

const ok = value => ({ ok: true, value })
// Connection 0.2 validates all three error fields, even on plugin channels.
const failed = message => ({ ok: false, error: { code: 'apophiscode/request-failed', message, details: {} } })

/** Only sentences this plugin authored may reach the browser. */
const SAFE_MESSAGE = /^(?:ApophisCode|That |Unknown |ApophisCode's |add |the )[\s\S]{0,180}$/u

const keyId = payload => String(payload?.id ?? '')

/**
 * Build the RPC handler.
 * @param options - the key ring, the balance and group readers, the host
 *   preference, and the optional Claude Code CLI support, plugin manager and
 *   web search controller (without one, its endpoints refuse).
 * @returns a handler for `connection.rpc.handle(CHANNEL, handler)`.
 */
export function createApophisCodeRpc({ ring, balance, groups, hosts, preference, claude, pluginManager, search, modelSelection, images, imageOriginals, diagnostics }) {
  const need = (service, message) => {
    if (service === undefined) throw new Error(message)
    return service
  }
  const cli = () => need(claude, 'ApophisCode Claude Code CLI support is unavailable in this runtime')
  const manager = () => need(pluginManager, 'ApophisCode plugin version is unavailable')
  const webSearch = () => need(search, 'ApophisCode web search is unavailable in this runtime')
  const groupReader = () => need(groups, 'ApophisCode key groups are unavailable in this runtime')
  const models = () => need(modelSelection, 'ApophisCode model selection is unavailable in this runtime')
  const imageSupport = () => need(images, 'ApophisCode images are unavailable in this runtime')
  const originals = () => need(imageOriginals, 'ApophisCode original images are unavailable in this runtime')
  const diagnosis = () => need(diagnostics, 'ApophisCode diagnostics are unavailable in this runtime')

  const status = async () => ({
    ...(await ring.list()),
    hosts: hosts(),
    writable: preference.writable === true,
    defaults: { apiHost: DEFAULT_API_HOST, statusHost: DEFAULT_STATUS_HOST },
  })

  /**
   * Key mutations, each answered with the new status. Every one drops the
   * cached balance; one that changes which keys exist also drops the groups.
   */
  const keyMutations = {
    'keys/add': { run: payload => ring.add(payload?.key, payload?.label), changesKeys: true },
    'keys/rename': { run: payload => ring.rename(keyId(payload), payload?.label) },
    'keys/remove': { run: payload => ring.remove(keyId(payload)), changesKeys: true },
    'keys/remove-all': { run: () => ring.removeAll(), changesKeys: true },
    'keys/select': { run: payload => ring.select(keyId(payload)) },
    'keys/enable': { run: payload => ring.enable(keyId(payload)) },
    'keys/disable': { run: async payload => {
      const id = keyId(payload)
      if (!(await ring.list()).keys.some(entry => entry.id === id)) throw new Error('Unknown ApophisCode key')
      return ring.disable(id, 'user-disabled')
    } },
  }

  const endpoints = {
    status: () => status(),
    balance: async payload => {
      const [value, state] = await Promise.all([balance.read({ force: payload?.force === true }), ring.list()])
      return { ...value, activeId: state.activeId }
    },
    groups: async payload => {
      const reading = await groupReader().read({ force: payload?.force === true })
      if (payload?.force === true) modelSelection?.refresh?.()
      if (claude === undefined) return reading
      // Which transport each key's Claude requests take; group names only.
      return { ...reading, keys: reading.keys.map(entry => ({ ...entry, claudeTransport: claude.transportFor(entry.groups) })) }
    },
    'hosts/update': async payload => {
      if (preference.writable !== true) throw new Error('ApophisCode host overrides are not writable in this profile')
      await preference.set({
        apiHost: normalizeHost(payload?.apiHost, hosts().apiHost),
        statusHost: normalizeHost(payload?.statusHost, hosts().statusHost),
      })
      balance.invalidate()
      groups?.invalidate()
      modelSelection?.refresh?.()
      images?.invalidateBalance?.()
      return status()
    },
    'claude-cli/status': payload => cli().status({ force: payload?.force === true }),
    // Starts the install and answers at once; the panel polls the status
    // instead of holding one request open for minutes.
    'claude-cli/install': () => {
      cli().install()
      return cli().status()
    },
    'claude-cli/update': async payload => {
      await cli().update({ transport: payload?.transport })
      return cli().status()
    },
    'plugin/version': (payload, signal) => manager().read({ force: payload?.force === true, signal }),
    'plugin/update': (_payload, signal) => manager().update({ signal }),
    'search/status': () => webSearch().status(),
    'search/update': payload => webSearch().update({
      searchProvider: payload?.searchProvider,
      searchModel: payload?.searchModel,
    }),
    'models/status': async payload => {
      const force = payload?.force === true
      if (force) groups?.invalidate()
      try { return await models().status() }
      finally { if (force) modelSelection?.refresh?.() }
    },
    'models/update': payload => models().update({ selectedIds: payload?.selectedIds }),
    'images/status': () => imageSupport().status(),
    'images/balance': (payload, signal) => imageSupport().readBalance({ force: payload?.force === true, signal }),
    'images/original': (payload, signal) => originals().info(payload, signal),
    'images/original/chunk': (payload, signal) => originals().chunk(payload, signal),
    'images/update': payload => imageSupport().update(payload),
    'images/keys/add': payload => imageSupport().mutate('add', { key: payload?.key, label: payload?.label }),
    'images/keys/rename': payload => imageSupport().mutate('rename', { id: payload?.id, label: payload?.label }),
    'images/keys/remove': payload => imageSupport().mutate('remove', { id: payload?.id }),
    'images/keys/select': payload => imageSupport().mutate('select', { id: payload?.id }),
    'images/keys/enable': payload => imageSupport().mutate('enable', { id: payload?.id }),
    'diagnostics/sessions': (_payload, signal) => diagnosis().list(signal),
    'diagnostics/session': (payload, signal) => diagnosis().read(payload, signal),
  }

  return async (endpoint, payload, signal) => {
    try {
      const mutation = Object.hasOwn(keyMutations, endpoint) ? keyMutations[endpoint] : undefined
      if (mutation !== undefined) {
        await mutation.run(payload)
        balance.invalidate()
        if (mutation.changesKeys) groups?.invalidate()
        if (mutation.changesKeys || ['keys/select', 'keys/enable', 'keys/disable'].includes(endpoint)) modelSelection?.refresh?.()
        return ok(await status())
      }
      const handle = Object.hasOwn(endpoints, endpoint) ? endpoints[endpoint] : undefined
      if (handle === undefined) return failed('Unknown ApophisCode endpoint')
      return ok(await handle(payload, signal))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failed(SAFE_MESSAGE.test(message) ? message : 'ApophisCode request failed')
    }
  }
}
