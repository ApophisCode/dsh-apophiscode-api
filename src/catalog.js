/** Dynamic descriptors. Model identity and capabilities belong to the gateway. */
import { PROVIDER } from './constants.js'
import { apiRootHost } from './hosts.js'

export const API_BASE_PATHS = Object.freeze({
  'openai-responses': '/v1',
  'anthropic-messages': '',
  'openai-completions': '/v1',
  'google-generative-ai': '/v1beta',
})
export const modelApiHost = apiRootHost
const positive = value => Number.isSafeInteger(value) && value > 0 ? value : undefined
// Host control vocabulary, never a list of model capabilities.
export const EFFORT_IDS = Object.freeze(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])

/** Only structured declarations are read; names and supplier labels carry no capabilities. */
export function declaredMetadata(row = {}) {
  const api = Object.hasOwn(API_BASE_PATHS, row.api) ? row.api : undefined
  const contextWindow = positive(row.context_window ?? row.context_length ?? row.contextWindow)
  const maxTokens = positive(row.max_output_tokens ?? row.maxTokens)
  const modalities = row.input_modalities ?? row.input
  const input = Array.isArray(modalities) && modalities.length > 0 && modalities.every(value => ['text', 'image'].includes(value))
    ? [...new Set(modalities)] : undefined
  const efforts = row.reasoning_efforts ?? row.reasoningEfforts
  const reasoningEfforts = Array.isArray(efforts) && efforts.length > 0 && efforts.every(value => EFFORT_IDS.includes(value))
    ? Object.fromEntries([...new Set(efforts)].map(value => [value, value])) : undefined
  return { ...(api === undefined ? {} : { api }), ...(contextWindow === undefined ? {} : { contextWindow }),
    ...(maxTokens === undefined ? {} : { maxTokens }), ...(input === undefined ? {} : { input }),
    ...(reasoningEfforts === undefined ? {} : { reasoningEfforts }) }
}

/** No default models, aliases, inferred limits or inferred effort levels. */
export function createApophisCodeCatalog(apiHost, { models = [] } = {}) {
  return Object.freeze(models.map(({ id, ...metadata }) => Object.freeze({
    ...metadata, id, name: id, provider: PROVIDER,
    ...(metadata.reasoningEfforts === undefined ? {} : {
      reasoning: true, thinkingLevelMap: Object.fromEntries(EFFORT_IDS.map(level => [level, metadata.reasoningEfforts[level] ?? null])),
    }),
    baseUrl: `${apiRootHost(apiHost)}${API_BASE_PATHS[metadata.api]}`,
    // SDK accounting is disabled; these are not advertised gateway prices.
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  })))
}
