/**
 * Protocol/capability metadata for known exact ApophisCode model IDs.
 * Discovery comes from the active key's raw model list, not these templates.
 *
 * Protocol declarations are retained except DeepSeek's user-requested
 * Responses route. Live Apophis compatibility requires separate verification;
 * the base URLs below follow each SDK's path-composition rules:
 * - OpenAI/Codex traffic takes `/v1` in the base URL and never an endpoint
 *   path — the SDK appends `/responses` or `/chat/completions` itself.
 * - Anthropic traffic takes `https://www.apophis.uk` with **no** `/v1`: the
 *   Anthropic client appends `/v1/messages` itself.
 * - Each model pins one protocol without an automatic fallback.
 *
 * Effort levels come from each vendor's documentation, because an effort the
 * model does not support is refused before the request is sent: Claude Opus
 * 5.5 (platform.claude.com effort docs), GPT-6.1 Sol, GPT-6 Astra and GPT-5.6
 * Sol `reasoning.effort` (developers.openai.com model pages), DeepSeek
 * thinking levels (`off|low|high|max`, preserved on Responses), Grok 4.7
 * (docs.x.ai/developers/grok-4-7), and Gemini 4 Argon
 * (ai.google.dev/gemini-api/docs/models/gemini-4-argon and docs/openai).
 *
 * @module dsh-apophiscode-api/catalog
 */

import { DEFAULT_API_HOST, PROVIDER } from './constants.js'
import { apiRootHost } from './hosts.js'

/** pi-ai never reads this gateway's pricing; the harness zeroes cost anyway. */
const NO_COST = Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

const RESPONSES_BASE = `${DEFAULT_API_HOST}/v1`
const MESSAGES_BASE = DEFAULT_API_HOST
const GEMINI_BASE = `${DEFAULT_API_HOST}/v1beta`

/** The SDK, rather than the configured root, owns each protocol's version path. */
const API_BASE_PATHS = Object.freeze({
  'openai-completions': '/v1',
  'openai-responses': '/v1',
  'anthropic-messages': '',
  'google-generative-ai': '/v1beta',
})

/** Accept a gateway root or a root ending in one SDK version prefix. */
export function modelApiHost(value) {
  return apiRootHost(value)
}

/**
 * pi-ai thinking-level maps. A level pinned to `null` is unsupported; an
 * absent key keeps pi-ai's own default for that level. DeepSeek keeps `off`
 * available; the locked Responses SDK encodes it as `reasoning.effort: none`.
 */
const DEEPSEEK_LEVELS = Object.freeze({
  minimal: null,
  low: 'low',
  medium: null,
  high: 'high',
  xhigh: null,
  max: 'max',
})

// The locked SDK declares Pro as text-only with high/max thinking. Keep
// unsupported low and unverified off out of the offered controls.
const DEEPSEEK_PRO_LEVELS = Object.freeze({ ...DEEPSEEK_LEVELS, off: null, low: null })

/**
 * Claude 5.5 models, GPT-6.1 Sol, and GPT-6 Astra cannot disable reasoning, so `off` is
 * pinned unsupported; GPT-5.6 Sol is kept on the same levels. Claude effort is
 * sent through the native Messages API.
 */
const ALWAYS_THINKING_LEVELS = Object.freeze({
  off: null,
  minimal: null,
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
})

/** Grok 4.7 supports low | medium | high | xhigh, with no off or max. */
const GROK_LEVELS = Object.freeze({ ...ALWAYS_THINKING_LEVELS, max: null })

/** Gemini 4 Argon and 3.8 Flash support low | medium | high, with no off. */
const GEMINI_LEVELS = Object.freeze({ ...ALWAYS_THINKING_LEVELS, xhigh: null, max: null })

const ALL_MODELS = Object.freeze([
  Object.freeze({
    // Exact Apophis public-group ID. Do not infer the latest Flash vision
    // capability from DeepSeek's own alias routing on another service.
    id: 'deepseek-v4-flash',
    name: 'deepseek-v4-flash',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text']),
    cost: NO_COST,
    contextWindow: 1_000_000,
    maxTokens: 384_000,
    thinkingLevelMap: DEEPSEEK_LEVELS,
  }),
  Object.freeze({
    // Metadata from locked pi-ai 1.1.0's deepseek-v4-pro declaration.
    id: 'deepseek-v4-pro',
    name: 'deepseek-v4-pro',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text']),
    cost: NO_COST,
    contextWindow: 1_000_000,
    maxTokens: 384_000,
    thinkingLevelMap: DEEPSEEK_PRO_LEVELS,
  }),
  Object.freeze({
    // Exact Apophis ID; V4.1 Flash capability follows current DeepSeek docs
    // and the locked SDK's V4.1 Flash descriptor, not gateway success.
    id: 'deepseek-v4.1-flash',
    name: 'deepseek-v4.1-flash',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_000_000,
    maxTokens: 384_000,
    thinkingLevelMap: DEEPSEEK_LEVELS,
  }),
  Object.freeze({
    id: 'gpt-6.1-sol',
    name: 'gpt-6.1-sol',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_050_000,
    maxTokens: 128_000,
    thinkingLevelMap: ALWAYS_THINKING_LEVELS,
  }),
  Object.freeze({
    // developers.openai.com/api/docs/models/gpt-6-astra: Responses and Chat
    // Completions; text and image input; 1,050,000 context, 128,000 output;
    // `reasoning.effort` low | medium | high | xhigh | max (no `none`).
    id: 'gpt-6-astra',
    name: 'gpt-6-astra',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_050_000,
    maxTokens: 128_000,
    thinkingLevelMap: ALWAYS_THINKING_LEVELS,
  }),
  Object.freeze({
    // developers.openai.com/api/docs/models/gpt-5.6-sol: Responses and Chat
    // Completions; text and image input; 1,050,000 context, 128,000 output;
    // `reasoning.effort` none | low | medium | high | xhigh | max. `none` is
    // deliberately not offered, so it takes the same levels as GPT-6.1 Sol.
    id: 'gpt-5.6-sol',
    name: 'gpt-5.6-sol',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_050_000,
    maxTokens: 128_000,
    thinkingLevelMap: ALWAYS_THINKING_LEVELS,
  }),
  Object.freeze({
    // docs.x.ai/developers/grok-4-7: Responses; text/image input; 500K
    // context, no separate text-output cap. pi-ai requires a numeric output
    // ceiling and bounds it by the remaining context on each request.
    id: 'grok-4.7',
    name: 'grok-4.7',
    api: 'openai-responses',
    provider: PROVIDER,
    baseUrl: RESPONSES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 500_000,
    maxTokens: 500_000,
    thinkingLevelMap: GROK_LEVELS,
    compat: Object.freeze({ supportsLongCacheRetention: false }),
  }),
  Object.freeze({
    // The upstream catalog pins Argon to native Gemini. The Google
    // model page declares unified 1M context and 65,536 output per stream;
    // automatic continuation/long decode is not part of this route.
    id: 'gemini-4-argon',
    name: 'gemini-4-argon',
    api: 'google-generative-ai',
    provider: PROVIDER,
    baseUrl: GEMINI_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_048_576,
    maxTokens: 65_536,
    thinkingLevelMap: GEMINI_LEVELS,
  }),
  Object.freeze({
    // ai.google.dev/gemini-api/docs/models/gemini-3.8-flash. Keep the Gemini
    // family on its native protocol, including image and signature replay.
    id: 'gemini-3.8-flash',
    name: 'gemini-3.8-flash',
    api: 'google-generative-ai',
    provider: PROVIDER,
    baseUrl: GEMINI_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_048_576,
    maxTokens: 65_536,
    thinkingLevelMap: GEMINI_LEVELS,
  }),
  Object.freeze({
    id: 'claude-opus-5-5',
    name: 'claude-opus-5-5',
    api: 'anthropic-messages',
    provider: PROVIDER,
    baseUrl: MESSAGES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    thinkingLevelMap: ALWAYS_THINKING_LEVELS,
    compat: Object.freeze({
      // Adaptive thinking is always on for Opus 5.x: effort is the depth
      // control, and the model rejects temperature outright.
      forceAdaptiveThinking: true,
      supportsTemperature: false,
    }),
  }),
  Object.freeze({
    id: 'claude-sonnet-5-5',
    name: 'claude-sonnet-5-5',
    api: 'anthropic-messages',
    provider: PROVIDER,
    baseUrl: MESSAGES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    thinkingLevelMap: ALWAYS_THINKING_LEVELS,
    compat: Object.freeze({
      forceAdaptiveThinking: true,
      supportsTemperature: false,
    }),
  }),
  Object.freeze({
    // platform.claude.com/docs/en/models/haiku-5-5/overview: 1M context,
    // 128K max output — the same as Opus and Sonnet 5.5.
    id: 'claude-haiku-5-5',
    name: 'claude-haiku-5-5',
    api: 'anthropic-messages',
    provider: PROVIDER,
    baseUrl: MESSAGES_BASE,
    reasoning: true,
    input: Object.freeze(['text', 'image']),
    cost: NO_COST,
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    thinkingLevelMap: ALWAYS_THINKING_LEVELS,
    compat: Object.freeze({
      forceAdaptiveThinking: true,
      supportsTemperature: false,
    }),
  }),
])

// Default metadata templates and historical declarations are distinct from
// the live directory. Neither collection constrains IDs returned by the key.
const LEGACY_MODEL_IDS = new Set(['grok-4.7', 'gemini-4-argon', 'gemini-3.8-flash', 'claude-haiku-5-5'])
export const APOPHISCODE_MODELS = Object.freeze(ALL_MODELS.filter(model => !LEGACY_MODEL_IDS.has(model.id)))

/** Default metadata template IDs; not an availability or discovery allowlist. */
export const APOPHISCODE_MODEL_IDS = Object.freeze(APOPHISCODE_MODELS.map(model => model.id))

// These exact gateway IDs share documented family metadata. This table is
// never an advertised allowlist and never rewrites a request's model ID.
const METADATA = new Map(ALL_MODELS.map(model => [model.id, model]))
for (const [id, family] of [
  ['deepseek-flash', 'deepseek-v4.1-flash'],
  ['deepseek-v4-flash-0731', 'deepseek-v4-flash'],
  ['deepseek-v4.1-flash-expires-on-0910', 'deepseek-v4.1-flash'],
]) METADATA.set(id, { ...METADATA.get(family), id })

/** An absent metadata declaration blocks invocation, never discovery. */
export function modelMetadataError(id) {
  return METADATA.has(id) ? undefined : 'ApophisCode has no verified protocol and capability metadata for this model; invocation is unavailable'
}

/** Bind the complete catalog to one request destination without mutating the baseline. */
export function createApophisCodeCatalog(apiHost, { includeLegacy = false, modelIds } = {}) {
  const host = modelApiHost(apiHost)
  const declared = modelIds === undefined ? (includeLegacy ? [...METADATA.values()] : APOPHISCODE_MODELS)
    : [...modelIds].map(id => METADATA.get(id)).filter(Boolean)
  return Object.freeze(declared.map(model => Object.freeze({
    ...model,
    name: model.id,
    baseUrl: `${host}${API_BASE_PATHS[model.api]}`,
  })))
}
