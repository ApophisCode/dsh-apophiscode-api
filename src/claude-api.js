/** Claude Messages over HTTP, or through the explicitly selected CLI transport. */
import { createHash, randomUUID } from 'node:crypto'
import { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy'
import { finishClaudeStream } from './claude-stream.js'
import { createClaudeToolNames } from './claude-tools.js'
import { currentRequest } from './request-context.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

/** Preserve UUIDs; map other host session ids deterministically, without a key. */
export function sessionUuid(value) {
  if (typeof value !== 'string' || value === '') return randomUUID()
  if (UUID.test(value)) return value.toLowerCase()
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Keep pi-ai's Messages conversion, effort, tools, images and signed replay.
 * Use Apophis's public Messages contract without an invented CLI identity.
 * The bearer is always the explicit request key selected by this plugin;
 * there is no credential or
 * subprocess fallback. A client-policy refusal still reaches the route guard.
 *
 * With `cli`, a request explicitly selected for the official client is handed to
 * the Claude Code CLI transport instead of the network: the same payload,
 * the same SSE answer, DSH's tools listed through the CLI's MCP bridge.
 * @param options - `cli.choose({ apiKey, model })` decides per request;
 *   `cli.fetch(input, init, meta)` sends it.
 */
export function createClaudeApi({ cli } = {}) {
  const api = anthropicMessagesApi()
  const adapt = (options, toolNames) => {
    const suppliedHeaders = Object.fromEntries(Object.entries(options?.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]))
    return {
      ...options,
      headers: {
        ...suppliedHeaders,
        'x-api-key': null,
        authorization: typeof options?.apiKey === 'string' && options.apiKey !== '' ? `Bearer ${options.apiKey}` : null,
      },
      // Keep SDK encoding, feature headers and signed history. Requests never
      // follow redirects or replay historical client-policy refusals.
      fetch: async (input, init) => {
        const response = await (options?.fetch ?? globalThis.fetch)(input, { ...init, redirect: 'error' })
        return finishClaudeStream(response, init?.signal ?? (input instanceof Request ? input.signal : undefined))
      },
      onPayload: async (payload, model) => {
        const patched = toolNames.encodePayload(await options?.onPayload?.(payload, model) ?? payload)
        return {
          ...patched,
          // A title/plain-text request must not acquire unoffered tools.
          ...(!patched.tools?.length ? { tool_choice: { type: 'none' } } : {}),
        }
      },
    }
  }
  /**
   * The official CLI writes its own envelope, identity, effort and thinking
   * display; only DSH's payload (with CLI tool names) is handed over. The
   * route's request context says which DSH session, purpose and working
   * directory the request belongs to.
   */
  const adaptCli = (options, toolNames) => {
    const route = currentRequest()
    const meta = Object.freeze({
      apiKey: options?.apiKey,
      sessionId: sessionUuid(options?.sessionId),
      ...(route?.purpose === undefined ? {} : { purpose: route.purpose }),
      ...(typeof route?.cwd === 'string' ? { cwd: route.cwd } : {}),
    })
    return {
      ...options,
      fetch: async (input, init) => {
        const response = await cli.fetch(input, init, meta)
        return finishClaudeStream(response, init?.signal ?? (input instanceof Request ? input.signal : undefined))
      },
      onPayload: async (payload, model) => toolNames.encodePayload(await options?.onPayload?.(payload, model) ?? payload),
    }
  }
  const invoke = (method, model, context, options) => {
    const viaCli = cli !== undefined && cli.choose({ apiKey: options?.apiKey, model: model.id }) === true
    const names = createClaudeToolNames({ cli: viaCli })
    return names.decodeStream(api[method](model, context, (viaCli ? adaptCli : adapt)(options, names)))
  }
  return {
    ...api,
    stream: (model, context, options) => invoke('stream', model, context, options),
    streamSimple: (model, context, options) => invoke('streamSimple', model, context, options),
  }
}
