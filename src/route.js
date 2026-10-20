/**
 * The HTTP model route: the pi-ai provider profile and the adapter that
 * serves the active key's dynamic model directory over its selected protocol.
 *
 * @module dsh-apophiscode-api/route
 */

import { createUserMessage, LlmError, QUOTA_EXCEEDED_CODE, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'

import { modelApiHost, declaredMetadata } from './catalog.js'
import { createModelProtocolResolver } from './model-protocol.js'
import { requestedModelProtocol } from './model-protocol-policy.js'
import { reasoningReference, withReasoningReference } from './model-reasoning.js'
import { DISPLAY_NAME, PLUGIN_ID, PROVIDER } from './constants.js'
import { classifyUpstreamServerError, classifyTestMessagePolicy, TEST_MESSAGE_POLICY_CODE } from './failures.js'
import { createApophisCodeProvider, guardKeyRotation } from './provider.js'
import { withRequestContext } from './request-context.js'
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

/** A title uses the exact selected model and does not execute conversation tasks. */
function titleRequest(options) {
  if (options.purpose !== 'session-title') return options
  return { ...options, tools: [], messages: [...options.messages, createUserMessage({
    source: { kind: 'user' }, content: [{ type: 'text', text:
      'Name the preceding conversation. Reply only with a short session title in its language. Do not execute its tasks or use tools.' }],
  })] }
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
 * No model carries a per-request output cap in `configuredMaxTokens`.
 * Preparation resolves a protocol before handing the call to this profile.
 * @param provider - the route's pi-ai provider.
 * @returns the frozen profile handed to `PiAiAdapter`.
 */
export function createApophisCodeProfile(provider, modelErrors = new Map()) {
  return Object.freeze({
    provider: PROVIDER,
    displayName: DISPLAY_NAME,
    piProvider: provider,
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
 * Each request snapshots the active key, configured target and exact directory
 * row. HTTP is the default; an existing explicit CLI preference applies only
 * to the Messages transport and never triggers installation.
 * @param options - the key ring and chooser, the live `getApiHost` gateway root,
 *   the session id used when a caller supplies none, the attachment store
 *   image input is read from, an optional
 *   synchronous resolver for the initiating session's exact cwd, and the
 *   optional Claude Code CLI transport selector.
 * @returns a `PiAiAdapter` serving the `apophiscode` route.
 */
export function createRouteAdapter({ ring, keys, getApiHost, fallbackSessionId, resolveAttachments, resolveWorkingDirectory,
  isModelVisible = () => true, availableModelIds, availableModels, claudeCli, protocols = createModelProtocolResolver() }) {
  const publicInfo = (id, metadata = {}) => ({ provider: PROVIDER, id, name: id,
    ...(metadata.contextWindow === undefined ? {} : { context: { contextWindow: metadata.contextWindow } }),
    ...(metadata.input === undefined ? {} : { inputModalities: metadata.input }),
    ...(metadata.reasoningEfforts === undefined ? {} : { reasoning: { efforts: Object.keys(metadata.reasoningEfforts).map(id => ({ id, name: id })) } }),
  })
  const directory = async (entry, apiHost, signal) => availableModels === undefined
    ? [...await availableModelIds?.() ?? []].map(id => ({ id }))
    : availableModels({ entry, apiHost, signal })
  const inContext = (options, send) => {
    const clarified = clarifyWorkingDirectory(titleRequest(options), resolveWorkingDirectory)
    const cwd = workingDirectoryOf(resolveWorkingDirectory, options.sessionId)
    const context = { model: options.model, purpose: options.purpose, sessionId: options.sessionId, cwd,
      reasoningEffort: options.reasoningEffort }
    return classifyRouteFailures(withRequestContext(context, send(clarified)))
  }
  class DynamicAdapter extends PiAiAdapter {
    async listModels(provider) {
      if (provider !== PROVIDER) return []
      const active = await ring.activeKey()
      if (active === undefined) return []
      return (await directory(active, modelApiHost(getApiHost?.())))
        .filter(row => isModelVisible(row.id)).map(row => publicInfo(row.id, withReasoningReference(row.id, declaredMetadata(row))))
    }
    async resolveModel(provider, id, signal) {
      if (provider !== PROVIDER) throw new LlmError('Unknown ApophisCode provider', 'UNKNOWN_MODEL')
      const active = await ring.activeKey(), apiHost = modelApiHost(getApiHost?.())
      if (active === undefined) throw new LlmError('No usable ApophisCode API key', 'MISSING_CREDENTIAL')
      const row = (await directory(active, apiHost, signal)).find(item => item.id === id)
      if (row === undefined) throw new LlmError('ApophisCode model is absent from the active key model list', 'UNKNOWN_MODEL')
      return publicInfo(id, withReasoningReference(id, { ...protocols.peek({ apiHost, key: active.key, id }), ...declaredMetadata(row) }))
    }
    async prepareCall(provider, id, signal) {
      if (provider !== PROVIDER) throw new LlmError('Unknown ApophisCode provider', 'UNKNOWN_MODEL')
      const active = await keys.active(), apiHost = modelApiHost(getApiHost?.())
      if (active === undefined) throw new LlmError('No usable ApophisCode API key: add one under Settings → ApophisCode', 'MISSING_CREDENTIAL')
      const row = (await directory(active, apiHost, signal)).find(item => item.id === id)
      if (row === undefined) throw new LlmError('ApophisCode model is absent from the active key model list', 'UNKNOWN_MODEL')
      const referenceApi = reasoningReference(id)?.api
      const metadata = withReasoningReference(id, await protocols.resolve({ apiHost, key: active.key, id, row, signal, referenceApi,
        requestedApi: requestedModelProtocol(id) }))
      const raw = createApophisCodeProvider({ apiHost, claudeCli, models: [{ ...metadata, input: metadata.input ?? ['text'] }] })
      const guarded = method => (model, context, options) => guardKeyRotation(raw[method](model, context, {
        ...options, sessionId: options?.sessionId ?? fallbackSessionId,
      }), { key: active.key, onKeyFailure: keys.onKeyFailure })
      const piProvider = { ...raw, stream: guarded('stream'), streamSimple: guarded('streamSimple') }
      const profile = createApophisCodeProfile(piProvider)
      // Each prepared call owns its host/key/descriptor snapshot. Late probes cannot mutate another call.
      class PreparedAdapter extends PiAiAdapter {
        modelInfo() { return publicInfo(id, metadata) }
      }
      const adapter = new PreparedAdapter({ profiles: () => new Map([[PROVIDER, profile]]),
        resolveApiKey: async () => active.key,
        auth: { credentials: ringCredentialStore(ring), authContext: { env: async () => undefined, fileExists: async () => false } },
        resolveAttachments,
      })
      const prepared = await adapter.prepareCall(provider, id, signal)
      return { ...prepared, stream: options => {
        if (options.model !== id || options.provider !== provider) throw new LlmError('ApophisCode prepared model identity changed', 'INVALID_REQUEST')
        if (options.reasoningEffort !== undefined && !Object.hasOwn(metadata.reasoningEfforts ?? {}, options.reasoningEffort)) throw new LlmError('ApophisCode has no gateway or exact SDK declaration for this reasoning effort; select the provider default', 'UNSUPPORTED_REASONING_EFFORT')
        if (metadata.input === undefined && options.messages.some(message => message.content?.some(block => block.type === 'image' || block.type === 'image-ref'))) {
          throw new LlmError('ApophisCode image input capability is unverified for this key and model', 'UNSUPPORTED_CONTENT')
        }
        return inContext(options, routed => prepared.stream(routed))
      } }
    }
    async *stream(options) {
      const prepared = await this.prepareCall(options.provider, options.model, options.signal)
      yield* prepared.stream(options)
    }
  }
  return new DynamicAdapter({ profiles: () => new Map([[PROVIDER, createApophisCodeProfile(createApophisCodeProvider())]]) })
}
