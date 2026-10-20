/**
 * Web search wiring: the two search providers, the user's routing and model
 * preference, the profile-patch entry that makes DSH reach them, and the
 * projection the settings panel reads.
 *
 * @module dsh-apophiscode-api/search-controller
 */

import {
  createApophisCodeAutoSearchProvider,
  createApophisCodeSearchProvider,
  APOPHISCODE_AUTO_SEARCH_PROVIDER_ID,
  APOPHISCODE_SEARCH_PROVIDER_ID,
  SEARCH_MODE_AUTO,
  SEARCH_MODE_DEFAULT,
  SEARCH_MODE_APOPHISCODE,
  SEARCH_MODES,
} from './search.js'
import { usableFallback } from './search-composition.js'
import { fieldValue } from './preferences.js'

/** Routers other subscription plugins register; shown so the user knows who holds the slot. */
const FOREIGN_ROUTERS = Object.freeze({ codex: 'codex-subscription-auto', kimi: 'kimi-subscription-auto' })

/** Normalize a stored preference; anything unknown reads as the default. */
export function readSearchChoice(value) {
  const provider = fieldValue(value?.searchProvider)
  const selectedModel = fieldValue(value?.searchModel)
  const mode = SEARCH_MODES.includes(provider) ? provider : SEARCH_MODE_DEFAULT
  return { mode, model: typeof selectedModel === 'string' ? selectedModel : '' }
}

/** Only sentences this plugin wrote reach the browser. */
function safeMessage(error) {
  const message = error instanceof Error ? error.message : String(error)
  return /^ApophisCode /u.test(message) ? message.slice(0, 240) : 'ApophisCode web search could not update the profile patch'
}

/**
 * @param options - the key ring and hosts the search runs with, the key-failure
 *   sink shared with the model route, the active-key directory, the preference reader
 *   and writer, the initiating session's provider and id, the web row's Loader
 *   entry, the profile-patch composition, a logger, and an optional fetch.
 */
export function createSearchController({
  ring,
  hosts,
  onKeyFailure,
  readPreference,
  writePreference,
  isWritable = () => typeof writePreference === 'function',
  resolveModelProvider,
  resolveSessionId,
  webEntry = () => undefined,
  composition,
  logger,
  fetchImpl,
  availableModels = async () => [],
  protocols,
}) {
  let web
  let fallbackId
  let applied = { state: 'idle' }
  let chain = Promise.resolve()

  const preference = () => readSearchChoice(readPreference?.())

  const apophiscode = createApophisCodeSearchProvider({
    ring,
    hosts,
    selectedModel: () => preference().model,
    availableModels, protocols,
    onKeyFailure,
    resolveSessionId,
    ...(fetchImpl === undefined ? {} : { fetchImpl }),
  })

  const auto = createApophisCodeAutoSearchProvider({
    apophiscode,
    resolveModelProvider,
    resolveProvider: id => web?.searchProviders?.get?.(id),
    // Before the first reconcile, the base config may already name this
    // plugin; usableFallback then answers DSH's built-in search.
    resolveFallbackId: () => fallbackId ?? usableFallback(webEntry()?.options?.config?.searchProvider),
  })

  /** Make the profile patch match the preference; serialized, idempotent. */
  const reconcile = () => {
    const run = async () => {
      if (web === undefined || composition === undefined) {
        applied = { state: 'unavailable' }
        return
      }
      const { mode } = preference()
      try {
        if (mode === SEARCH_MODE_DEFAULT) {
          await composition.remove()
          fallbackId = undefined
          applied = { state: 'removed' }
        } else {
          const outcome = await composition.apply(mode === SEARCH_MODE_AUTO ? APOPHISCODE_AUTO_SEARCH_PROVIDER_ID : APOPHISCODE_SEARCH_PROVIDER_ID)
          fallbackId = outcome.fallback
          applied = { state: 'applied', fallback: outcome.fallback }
        }
      } catch (error) {
        applied = { state: 'failed', error: safeMessage(error) }
        logger?.warn?.('apophiscode-api: could not apply the web search selection: %s', error?.message ?? String(error))
      }
    }
    const next = chain.then(run)
    chain = next.then(() => undefined, () => undefined)
    return next
  }

  const status = async () => {
    const { mode, model } = preference()
    let models = [], modelError
    try { models = await availableModels() }
    catch { modelError = 'ApophisCode search model list could not be read; check the active key and gateway' }
    const entry = webEntry()
    const base = entry?.options?.config?.searchProvider
    const runtime = entry?.fiber?.config?.searchProvider
    return {
      searchProvider: mode,
      searchModel: model,
      writable: isWritable() === true,
      available: web !== undefined,
      models: models.map(row => ({ id: row.id })),
      ...(modelError === undefined ? {} : { modelError }),
      effective: {
        ...(typeof base === 'string' ? { base } : {}),
        ...(typeof runtime === 'string' ? { runtime } : {}),
      },
      applied: { ...applied },
      foreign: Object.fromEntries(Object.entries(FOREIGN_ROUTERS).map(([name, id]) => [name, web?.searchProviders?.has?.(id) === true])),
    }
  }

  return Object.freeze({
    apophiscode,
    auto,
    /**
     * Register both providers with the web service and reconcile once.
     * @param service - the `web` service, as the inject scope hands it over.
     * @param effect - that scope's effect registrar.
     */
    register(service, effect) {
      effect(() => {
        web = service
        const disposeApophisCode = service.registerSearchProvider(apophiscode)
        const disposeAuto = service.registerSearchProvider(auto)
        return () => {
          disposeAuto?.()
          disposeApophisCode?.()
          if (web === service) web = undefined
        }
      }, 'apophiscode-api: web search providers')
      void reconcile()
    },
    reconcile,
    status,
    /** Validate, persist, and apply a preference change. */
    async update(patch) {
      const next = {}
      if (patch?.searchProvider !== undefined) {
        if (!SEARCH_MODES.includes(patch.searchProvider)) throw new Error('That ApophisCode search option is not supported')
        next.searchProvider = patch.searchProvider
      }
      if (patch?.searchModel !== undefined) {
        if (patch.searchModel !== '' && !(await availableModels()).some(row => row.id === patch.searchModel)) throw new Error('ApophisCode search model is absent from the active key model list')
        next.searchModel = patch.searchModel
      }
      if (Object.keys(next).length === 0) return status()
      if (isWritable() !== true || typeof writePreference !== 'function') {
        throw new Error('ApophisCode settings are not writable in this profile')
      }
      try {
        await writePreference(next)
      } catch (error) {
        logger?.warn?.('apophiscode-api: could not save the web search preference: %s', error?.message ?? String(error))
        throw new Error('ApophisCode could not save the web search preference', { cause: error })
      }
      await reconcile()
      return status()
    },
  })
}

export { SEARCH_MODE_AUTO, SEARCH_MODE_DEFAULT, SEARCH_MODE_APOPHISCODE }
