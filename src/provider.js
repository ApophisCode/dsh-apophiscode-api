/**
 * The ApophisCode pi-ai provider, built in code so the user configures no route.
 *
 * `createProvider` dispatches on `model.api`, which is what lets one route
 * carry Chat Completions, Responses, Anthropic Messages and native Gemini
 * models — the gateway refuses some of them over other protocols.
 *
 * @module dsh-apophiscode-api/provider
 */

import { createProvider } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { openAIResponsesApi } from '@earendil-works/pi-ai/api/openai-responses.lazy'

import { createApophisCodeCatalog, modelApiHost } from './catalog.js'
import { createClaudeApi } from './claude-api.js'
import { DISPLAY_NAME, PROVIDER } from './constants.js'
import { createGeminiApi } from './gemini-api.js'
import { redactSecrets } from './secret-redactor.js'
import { MESSAGES_REQUEST_BUDGET } from './model-protocol.js'
import { reasoningReference } from './model-reasoning.js'
import { currentRequest } from './request-context.js'
import {
  CLI_MARK,
  classifyCliOutdated,
  classifyCliUnavailable,
  classifyClientPolicy,
  classifyGatewayFailure,
  classifyTestMessagePolicy,
  explainCliClientPolicyFailure,
  explainCliOutdated,
  explainCliUnavailable,
  explainClientPolicyFailure,
  explainTestMessagePolicyFailure,
  normalizeFailureMessage,
} from './failures.js'

const TERMINAL_EVENTS = new Set(['error', 'done'])

/**
 * A plugin-authored sentence for failures no retry can clear, or undefined.
 * Each carries no status token, so DSH shows it once instead of retrying.
 */
function explainFinalFailure(text) {
  if (classifyCliUnavailable(text)) return explainCliUnavailable(text)
  if (classifyCliOutdated(text)) return explainCliOutdated(text)
  if (classifyTestMessagePolicy(text)) return explainTestMessagePolicyFailure()
  // A client-policy refusal is about this client, not this key: explain it
  // and leave the ring alone. The official CLI's own refusal gets other advice.
  if (classifyClientPolicy(text)) return text.includes(CLI_MARK) ? explainCliClientPolicyFailure(text) : explainClientPolicyFailure(text)
  return undefined
}

/**
 * The api-key method pi-ai consults before it honours a request's `apiKey`
 * override. Resolution itself stays empty: this plugin authenticates from its
 * own key ring through the adapter, and ambient environment-key discovery
 * is disabled at the adapter's auth context.
 * @returns the provider auth for this route.
 */
function keyRingAuth() {
  return {
    apiKey: {
      name: DISPLAY_NAME,
      resolve: () => Promise.resolve({ auth: {}, source: DISPLAY_NAME }),
    },
  }
}

/** Keep the SDK's encoding and caller fetch hook; authenticated requests never follow redirects. */
function explicitTargetApi(api) {
  const optionsFor = options => ({
    ...options,
    fetch: (input, init) => (options?.fetch ?? globalThis.fetch)(input, { ...init, redirect: 'error' }),
  })
  return {
    ...api,
    stream: (model, context, options) => api.stream(model, context, optionsFor(options)),
    streamSimple: (model, context, options) => api.streamSimple(model, context, optionsFor(options)),
  }
}

/**
 * Build the route's pi-ai provider (unguarded; the plugin wraps its streams).
 * @param options - `apiHost`, the configured gateway root, and `claudeCli`,
 *   the explicitly configured Claude Code CLI transport selector.
 */
export function createApophisCodeProvider({ apiHost, claudeCli, models = [] } = {}) {
  const provider = createProvider({
    id: PROVIDER,
    name: DISPLAY_NAME,
    baseUrl: modelApiHost(apiHost),
    auth: keyRingAuth(),
    models: createApophisCodeCatalog(apiHost, { models }),
    api: {
      'openai-completions': explicitTargetApi(openAICompletionsApi()),
      'openai-responses': explicitTargetApi(openAIResponsesApi()),
      'anthropic-messages': createClaudeApi({ cli: claudeCli }),
      'google-generative-ai': createGeminiApi(),
    },
  })
  // Native stream preserves server defaults. Only an explicit effort with an
  // exact SDK reference may use that supplier's simple-to-native encoder.
  const requestOptions = (model, options, sdkEncoding = false, callerMaxTokens) => ({
    ...options,
    ...(model.api === 'anthropic-messages' && options?.maxTokens === undefined
      ? { maxTokens: MESSAGES_REQUEST_BUDGET } : {}),
    // The native codecs still contain vendor-name defaults. Remove inferred
    // reasoning controls; only a caller's explicit, declared effort is sent.
    onPayload: async payload => {
      const effort = currentRequest()?.reasoningEffort ?? options?.reasoningEffort ?? options?.reasoning
      if (sdkEncoding) {
        // The exact supplier descriptor and SDK codec own explicit parameter
        // encoding, including budget-based versus adaptive reasoning.
        if (model.api === 'anthropic-messages' && callerMaxTokens !== undefined) {
          payload.max_tokens = Math.min(payload.max_tokens, callerMaxTokens)
          if (payload.thinking?.type === 'enabled' && payload.thinking.budget_tokens >= payload.max_tokens) {
            throw new Error('ApophisCode output limit is too small for the selected thinking budget; increase the output limit or select another effort. The effort was not lowered.')
          }
        }
        return await options?.onPayload?.(payload, model) ?? payload
      }
      if (model.api === 'openai-completions') {
        delete payload.reasoning_effort
        delete payload.thinking
        if (effort !== undefined) payload.reasoning_effort = effort === 'off' ? 'none' : effort
      } else if (model.api === 'openai-responses') {
        delete payload.reasoning
        if (effort !== undefined) {
          payload.reasoning = { effort: effort === 'off' ? 'none' : effort }
          if (effort !== 'off') payload.include = [...new Set([...(payload.include ?? []), 'reasoning.encrypted_content'])]
        }
      } else if (model.api === 'anthropic-messages') {
        delete payload.thinking
        if (payload.output_config) delete payload.output_config.effort
        if (effort === 'off') payload.thinking = { type: 'disabled' }
        else if (effort !== undefined) payload.output_config = { ...payload.output_config, effort }
      } else if (model.api === 'google-generative-ai') {
        delete payload.config?.thinkingConfig
        if (effort !== undefined) payload.config = { ...payload.config, thinkingConfig: effort === 'off'
          ? { thinkingBudget: 0 } : { includeThoughts: true, thinkingLevel: effort.toUpperCase() } }
      }
      return await options?.onPayload?.(payload, model) ?? payload
    },
  })
  const stream = (model, context, options) => {
    const effort = currentRequest()?.reasoningEffort ?? options?.reasoningEffort ?? options?.reasoning
    const reference = model.reasoningSource === 'sdk' ? reasoningReference(model.id)?.reference : undefined
    if (effort !== undefined && reference?.api === model.api) {
      // Supplier limits are used only by its encoder; they are never exposed as
      // gateway capacities. The caller's cap wins; omitted caps use our budget.
      const requestModel = { ...reference, ...model, compat: reference.compat }
      return provider.streamSimple(requestModel, context, requestOptions(requestModel, { ...options,
        reasoning: effort === 'off' ? undefined : effort,
        maxTokens: options?.maxTokens ?? MESSAGES_REQUEST_BUDGET,
      }, true, options?.maxTokens))
    }
    return provider.stream(model, context, requestOptions(model, options))
  }
  return Object.freeze({
    ...provider,
    stream,
    streamSimple: stream,
  })
}

/**
 * Observe a pi-ai event stream and hand a key-level failure to the plugin.
 *
 * pi-ai reports request failures as terminal events carrying the assistant
 * message's `errorMessage`, and transport failures as thrown errors. Both are
 * classified here; the substituted sentence is what makes the harness's retry
 * policy re-run the step, which is the mechanism that reaches the next key. A
 * thrown failure is only attributed to the key when no chunk arrived: a stream
 * that broke mid-answer had already been accepted by the gateway.
 * @param stream - the pi-ai event stream.
 * @param options - the request's key plus the failure sink.
 * @returns the same stream, with key-level failures classified and rewritten.
 */
export function guardKeyRotation(stream, { onKeyFailure, key } = {}) {
  if (stream === null || typeof stream !== 'object') return stream
  let observed = false

  const report = (kind, message) => onKeyFailure?.(kind, message, key)

  const inspect = value => {
    if (value === null || typeof value !== 'object' || !TERMINAL_EVENTS.has(value.type)) return value
    // An upstream can echo credentials in its error body. Redact the whole
    // message before classification, host rendering or diagnostic truncation.
    for (const carrierKey of ['error', 'message']) {
      const carrier = value[carrierKey]
      if (typeof carrier?.errorMessage !== 'string') continue
      const safe = redactSecrets(carrier.errorMessage, key === undefined ? [] : [key])
      if (safe !== carrier.errorMessage) value = { ...value, [carrierKey]: { ...carrier, errorMessage: safe } }
    }
    for (const carrierKey of ['error', 'message']) {
      const carrier = value[carrierKey]
      if (carrier === null || typeof carrier !== 'object') continue
      const explained = explainFinalFailure(carrier.errorMessage)
      if (explained !== undefined) return { ...value, [carrierKey]: { ...carrier, errorMessage: explained } }
      const kind = classifyGatewayFailure(carrier.errorMessage)
      if (kind === undefined) continue
      report(kind, carrier.errorMessage)
      return { ...value, [carrierKey]: { ...carrier, errorMessage: normalizeFailureMessage(carrier.errorMessage, kind) } }
    }
    return value
  }

  return new Proxy(stream, {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncIterator) {
        return () => {
          const iterator = Reflect.get(target, Symbol.asyncIterator).call(target)
          return {
            next: async (...args) => {
              try {
                const item = await iterator.next(...args)
                observed = true
                if (item === null || typeof item !== 'object' || item.done === true) return item
                const value = inspect(item.value)
                return value === item.value ? item : { ...item, value }
              } catch (error) {
                const original = error instanceof Error ? error.message : String(error)
                const text = redactSecrets(original, key === undefined ? [] : [key])
                const cause = text === original ? error : new Error(text)
                // The policy refusal is worth explaining even mid-stream; a
                // key fault is only the key's when nothing was answered yet.
                const explained = explainFinalFailure(text)
                if (explained !== undefined) throw new Error(explained, { cause })
                const kind = observed ? undefined : classifyGatewayFailure(text)
                if (kind !== undefined) {
                  report(kind, text)
                  throw new Error(normalizeFailureMessage(text, kind), { cause })
                }
                if (text !== original) throw cause
                throw error
              }
            },
            ...(typeof iterator.return === 'function' ? { return: (...args) => iterator.return(...args) } : {}),
            ...(typeof iterator.throw === 'function' ? { throw: (...args) => iterator.throw(...args) } : {}),
          }
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
