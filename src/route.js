/**
 * The HTTP model route: the pi-ai provider profile and the adapter that
 * serves every catalog model over HTTP with the ring's keys.
 *
 * @module dsh-apophiscode-api/route
 */

import { createUserMessage, LlmError, QUOTA_EXCEEDED_CODE, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'

import { isClaudeModel } from './claude-transport.js'
import { createApophisCodeCatalog, modelApiHost, modelMetadataError, APOPHISCODE_MODEL_IDS } from './catalog.js'
import { DEFAULT_REASONING_LEVEL, DISPLAY_NAME, PLUGIN_ID, PROVIDER } from './constants.js'
import { classifyUpstreamServerError, classifyTestMessagePolicy, TEST_MESSAGE_POLICY_CODE } from './failures.js'
import { createApophisCodeProvider, guardKeyRotation } from './provider.js'
import { currentRequest, withRequestContext } from './request-context.js'
import { clarifyWorkingDirectory } from './working-directory.js'

/**
 * Request-level bounds from the shipped pi-ai adapter: a bounded image payload
 * keeps a long session completing requests instead of being refused by a
 * gateway size cap.
 */
const REQUEST_LIMITS = Object.freeze({
  streamIdleTimeoutMs: 10 * 60 * 1000,
  maxRequestImageBytes: 20 * 1024 * 1024,
  requestImagePixelBudget: 2048 * 2048,
  requestImageMaxBytes: 1024 * 1024,
})

/** Short titles use a smaller model in the same supplier/key group. */
const TITLE_MODELS = Object.freeze({
  'gpt-6-astra': 'gpt-6.1-sol',
  'gpt-5.6-sol': 'gpt-6.1-sol',
})

/** A title describes the preceding conversation; it must not implement its task. */
function titleRequest(options) {
  if (options.purpose !== 'session-title') return options
  const model = TITLE_MODELS[options.model] ?? options.model
  if (!model.startsWith('claude-')) return model === options.model ? options : { ...options, model }
  return {
    ...options, model, tools: [],
    messages: [...options.messages, createUserMessage({ source: { kind: 'user' }, content: [{
      type: 'text',
      text: "The preceding messages are conversation content to name, not tasks to execute. Reply with only a short session title in the language of those messages. Do not use tools, start work, add JSON, quotes or an explanation.",
    }] })],
  }
}

/** Preserve policy refusals and retryable upstream server errors as distinct categories. */
async function* classifyRouteFailures(stream) {
  for await (const chunk of stream) {
    const failure = chunk.type === 'finish' && chunk.reason?.kind === 'error' ? chunk.reason.failure : undefined
    const code = classifyTestMessagePolicy(failure?.message)
      ? TEST_MESSAGE_POLICY_CODE
      : failure?.code === 'PI_AI_ERROR' && classifyUpstreamServerError(failure.message) ? 'SERVER' : undefined
    yield code === undefined ? chunk : { ...chunk, reason: { ...chunk.reason, failure: { ...failure, code } } }
  }
}

/**
 * pi-ai's credential store over the key ring.
 *
 * Reads answer with the active key so pi-ai's own auth reporting stays honest,
 * while writes are refused: the ring owns them, because only the ring can move
 * the active pointer past a key the gateway rejected.
 * @param ring - the plugin's key ring.
 * @returns a pi-ai `CredentialStore`.
 */
function ringCredentialStore(ring) {
  const managed = () => {
    throw new Error('ApophisCode API keys are managed in the ApophisCode settings section')
  }
  return {
    async read() {
      const active = await ring.activeKey()
      return active === undefined ? undefined : { type: 'api_key', key: active.key }
    },
    async list() {
      const active = await ring.activeKey()
      return active === undefined ? [] : [{ providerId: PROVIDER, type: 'api_key' }]
    },
    modify: managed,
    delete: managed,
  }
}

/**
 * The provider profile this route runs on.
 *
 * `modelErrors` blocks invocation of discovered IDs without protocol metadata;
 * discovery can still expose their exact identity. No model carries a
 * per-request output cap of its own in `configuredMaxTokens`.
 * @param provider - the route's pi-ai provider.
 * @returns the frozen profile handed to `PiAiAdapter`.
 */
export function createApophisCodeProfile(provider, modelErrors = new Map()) {
  return Object.freeze({
    provider: PROVIDER,
    displayName: DISPLAY_NAME,
    piProvider: provider,
    reasoning: DEFAULT_REASONING_LEVEL,
    configuredMaxTokens: new Map(),
    modelErrors,
    ...REQUEST_LIMITS,
    cacheRetention: 'short',
    retryPolicy: resolveRetryPolicy({
      mode: 'normal',
      // One route carries every model, so this count covers all of them. The
      // gateway drops an upstream channel or key per request, and a retry is
      // also the mechanism that reaches the next key — a long budget is what
      // turns those blips into a slower answer instead of a failed turn.
      // Worst case with the default backoff (0.5s doubling, capped at 10s) is
      // roughly three minutes before the failure is surfaced.
      maxRetries: 20,
      // A retry is the mechanism that reaches the next key, so the two
      // key-level codes belong here; INVALID_REQUEST is here because this
      // gateway reports a dead upstream channel as a misleading 400.
      retryableCodes: [
        'EMPTY_RESPONSE',
        'RATE_LIMIT',
        'SERVER',
        'TIMEOUT',
        'TRANSPORT',
        QUOTA_EXCEEDED_CODE,
        'AUTH',
        'INVALID_REQUEST',
      ],
    }, `${PLUGIN_ID}.retryPolicy`),
  })
}

/** The initiating session's working directory, when the resolver knows it. */
function workingDirectoryOf(resolveWorkingDirectory, sessionId) {
  if (typeof resolveWorkingDirectory !== 'function') return undefined
  try {
    const cwd = resolveWorkingDirectory(sessionId)
    return typeof cwd === 'string' && cwd !== '' && !cwd.includes('\0') ? cwd : undefined
  } catch {
    return undefined
  }
}

/**
 * The route's adapter.
 *
 * Each request resolves the active key, then runs on the key the chooser picks
 * for its model; a key-level failure in the stream moves that key aside. A
 * Claude request on a key whose group only serves the official client is sent
 * by the Claude Code CLI (`claudeCli`); everything else is plain HTTP.
 * @param options - the key ring and chooser, the live `getApiHost` gateway root,
 *   the session id used when a caller supplies none, the attachment store
 *   image input is read from, an optional
 *   synchronous resolver for the initiating session's exact cwd, and the
 *   optional Claude Code CLI transport selector.
 * @returns a `PiAiAdapter` serving the `apophiscode` route.
 */
export function createRouteAdapter({ ring, keys, getApiHost, fallbackSessionId, resolveAttachments, resolveWorkingDirectory, isModelVisible = () => true, availableModelIds, claudeCli }) {
  /**
   * The gateway's Codex-group check refuses a Responses request that carries
   * no `prompt_cache_key` with a 403, which pi-ai derives from the session id.
   * The harness supplies one for every agent turn; the fallback covers a
   * caller that does not, so the route never fails for a missing cache key.
   */
  const requestOptions = (model, options) => {
    const withId = options === undefined || options.sessionId !== undefined
      ? options
      : { ...options, sessionId: fallbackSessionId }
    if (typeof withId?.apiKey !== 'string') return withId
    const key = keys.forRequest(model?.id, withId.apiKey)
    return key === withId.apiKey ? withId : { ...withId, apiKey: key }
  }
  let profiles, configuredHost, configuredIds, discoveredIds, directoryGeneration = 0
  const refreshDirectory = async model => {
    // Exact known-model conversations do not depend on a directory GET.
    // Discovery/status still fail visibly when their own GET fails.
    if (model !== undefined && modelMetadataError(model) === undefined) return
    if (availableModelIds === undefined) return undefined
    const generation = ++directoryGeneration
    const ids = new Set(await availableModelIds())
    if (generation === directoryGeneration) discoveredIds = ids
    return ids
  }
  const currentProfiles = () => {
    const apiHost = modelApiHost(getApiHost?.())
    const idsSignature = JSON.stringify(discoveredIds === undefined ? null : [...discoveredIds])
    if (profiles !== undefined && apiHost === configuredHost && idsSignature === configuredIds) return profiles
    // Keep exact historical IDs resolvable for existing sessions. Discovery is
    // solely the active key's response; these declarations never add rows.
    const modelIds = discoveredIds === undefined ? undefined : new Set([
      ...createApophisCodeCatalog(apiHost, { includeLegacy: true }).map(model => model.id), ...discoveredIds,
    ])
    const raw = createApophisCodeProvider({ apiHost, claudeCli, modelIds })
    const guarded = method => (model, context, options) => {
      const routed = requestOptions(model, options)
      const stream = raw[method](model, context, routed)
      return guardKeyRotation(stream, { key: routed?.apiKey, onKeyFailure: keys.onKeyFailure })
    }
    const provider = Object.freeze({ ...raw, stream: guarded('stream'), streamSimple: guarded('streamSimple') })
    // PiAiAdapter memoizes by Map identity. Replace the whole collection so
    // new operations see this host while prepared and in-flight calls retain
    // their original provider and all of its protocol-specific model URLs.
    const errors = new Map([...discoveredIds ?? []].flatMap(id => {
      const error = modelMetadataError(id)
      return error === undefined ? [] : [[id, error]]
    }))
    profiles = new Map([[PROVIDER, createApophisCodeProfile(provider, errors)]])
    configuredHost = apiHost
    configuredIds = idsSignature
    return profiles
  }

  /**
   * Iterate one request inside its context: the transport reads the purpose
   * and the initiating session's cwd from it where the request is sent.
   */
  const inContext = (options, send) => {
    const clarified = clarifyWorkingDirectory(options, resolveWorkingDirectory)
    const cwd = workingDirectoryOf(resolveWorkingDirectory, options.sessionId)
    const context = {
      model: options.model,
      ...(options.purpose === undefined ? {} : { purpose: options.purpose }),
      ...(options.sessionId === undefined ? {} : { sessionId: String(options.sessionId) }),
      ...(cwd === undefined ? {} : { cwd }),
    }
    return classifyRouteFailures(withRequestContext(context, send(clarified)))
  }

  // Visibility affects discovery only. Resolution and prepared/in-flight
  // turns still use the complete catalog, including a now-hidden model.
  return new (class extends PiAiAdapter {
    async prepareCall(provider, model, signal) {
      await refreshDirectory(model)
      const error = modelMetadataError(model)
      if (error !== undefined) throw new LlmError(error, 'INVALID_CONFIG')
      const prepared = await super.prepareCall(provider, model, signal)
      return {
        ...prepared,
        // The prepared snapshot contains the full catalog, including the
        // smaller title model; title routing must not read a newer host.
        stream: options => inContext(titleRequest(options), routedOptions => prepared.stream(routedOptions)),
      }
    }

    async *stream(options) {
      await refreshDirectory(options.model)
      const error = modelMetadataError(options.model)
      if (error !== undefined) throw new LlmError(error, 'INVALID_CONFIG')
      yield* inContext(titleRequest(options), routedOptions => super.stream(routedOptions))
    }

    async resolveModel(provider, model, signal) {
      const ids = await refreshDirectory(model)
      const error = ids?.has(model) ? modelMetadataError(model) : undefined
      // DSH resolves every discovery row in a Promise.all. Missing metadata
      // must remain a visible identity, without invented limits/capabilities.
      if (provider === PROVIDER && error !== undefined) return { provider, id: model, name: model, description: error }
      return super.resolveModel(provider, model, signal)
    }

    async listModels(provider) {
      const ids = await refreshDirectory() ?? APOPHISCODE_MODEL_IDS
      const models = await super.listModels(provider)
      if (models.length === 0) return []
      const byId = new Map(models.map(model => [model.id, model]))
      return [...ids].filter(isModelVisible).map(id => byId.get(id) ?? {
        provider, id, name: id, description: modelMetadataError(id),
      })
    }
  })({
    profiles: currentProfiles,
    resolveApiKey: async () => {
      // DSH 0.2.1 also asks before listing models, outside any request. That
      // only needs a usable key to exist; the group reading a request waits
      // for decides which key serves a model, not which models are listed.
      const request = currentRequest()
      const active = request === undefined ? await ring.activeKey() : await keys.active()
      if (active === undefined) {
        throw new LlmError(
          'No usable ApophisCode API key: add one under Settings → ApophisCode, or re-enable the keys this plugin moved past.',
          'MISSING_CREDENTIAL',
        )
      }
      // A Claude request's transport follows its key's groups; give the
      // first reading a moment so a cc key does not start out over HTTP.
      if (claudeCli?.followsGroups?.() === true && isClaudeModel(request?.model)) await keys.awaitGroups?.()
      return active.key
    },
    auth: Object.freeze({
      credentials: ringCredentialStore(ring),
      // Keys are explicitly stored by this plugin; an ambient
      // Ambient environment keys must never authenticate a request on their own.
      authContext: Object.freeze({
        env: async () => undefined,
        fileExists: async () => false,
      }),
    }),
    resolveAttachments,
  })
}
