/** Optional exact-ID reasoning references. These never advertise models or authenticate. */
import { getSupportedThinkingLevels } from '@earendil-works/pi-ai'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import { deepseekProvider } from '@earendil-works/pi-ai/providers/deepseek'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { xaiProvider } from '@earendil-works/pi-ai/providers/xai'
import { getBuiltinModels, getBuiltinProviders } from '@earendil-works/pi-ai/providers/all'
import { API_BASE_PATHS } from './catalog.js'

function effortDeclaration(model) {
  if (!model.reasoning) return undefined
  return Object.fromEntries(getSupportedThinkingLevels(model).map(level => [level, model.thinkingLevelMap?.[level] ?? level]))
}

/** Register codec suppliers, not model names, aliases, capacities or effort tables. */
export function createReasoningReferences(providers, supplementaryModels = []) {
  const byId = new Map()
  for (const provider of providers) for (const model of provider.getModels()) {
    const previous = byId.get(model.id)
    // Conflicting suppliers cannot authorize a capability by name alone.
    if (byId.has(model.id) && JSON.stringify(previous) !== JSON.stringify(model)) byId.set(model.id, null)
    else if (!byId.has(model.id)) byId.set(model.id, model)
  }
  // Other SDK catalogs can contain an exact ID absent from its native supplier.
  // Read only agreements on supported protocol and effort declarations. Their
  // hosts, auth, headers, limits and compatibility settings belong elsewhere.
  const supplementary = new Map()
  for (const model of supplementaryModels) {
    if (!Object.hasOwn(API_BASE_PATHS, model.api)) continue
    const declaration = { api: model.api, reasoningEfforts: effortDeclaration(model) }
    const previous = supplementary.get(model.id)
    if (previous === undefined) supplementary.set(model.id, declaration)
    else for (const field of ['api', 'reasoningEfforts']) {
      if (JSON.stringify(previous[field]) !== JSON.stringify(declaration[field])) previous[field] = undefined
    }
  }
  return id => {
    if (!byId.has(id)) return supplementary.get(id)
    const reference = byId.get(id)
    if (!reference) return undefined
    return { reference, api: reference.api, reasoningEfforts: effortDeclaration(reference) }
  }
}

export const reasoningReference = createReasoningReferences([
  anthropicProvider(), deepseekProvider(), googleProvider(), openaiProvider(), xaiProvider(),
], getBuiltinProviders().flatMap(provider => getBuiltinModels(provider)))

/** Gateway declarations win; an SDK reference supplements reasoning only. */
export function withReasoningReference(id, metadata) {
  if (metadata.reasoningEfforts !== undefined) return metadata
  const match = reasoningReference(id)
  return match?.reasoningEfforts === undefined ? metadata : { ...metadata, reasoningEfforts: match.reasoningEfforts, reasoningSource: 'sdk' }
}
