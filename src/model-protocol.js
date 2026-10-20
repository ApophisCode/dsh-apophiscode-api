/** Independent, bounded protocol verification. Never sends user content or replays business requests. */
import { createHash } from 'node:crypto'
import { API_BASE_PATHS, declaredMetadata } from './catalog.js'
import { apiRootHost } from './hosts.js'
import { ambientFetch, boundedFetch, waitForSharedRequest } from './request.js'
import { redactSecrets } from './secret-redactor.js'

export const PROTOCOL_PROBE_TEXT = 'Reply with OK.'
// This is this application's request budget, never a model capacity declaration.
export const MESSAGES_REQUEST_BUDGET = 8192
const protocols = Object.keys(API_BASE_PATHS)
const MAX_PROBE_BYTES = 64 * 1024
const TRANSPORT_CODES = new Set(['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID'])

/** Fixed diagnostic fields cannot echo request credentials or raw transport errors. */
function verificationFailure(api, { kind, detail, stage, status, transportCode }) {
  const endpoint = api === 'google-generative-ai' ? '/v1beta/models/{model}:generateContent'
    : `${API_BASE_PATHS[api]}${api === 'openai-responses' ? '/responses' : api === 'anthropic-messages' ? '/v1/messages' : '/chat/completions'}`
  return Object.assign(new Error(`ApophisCode protocol verification ${detail} (POST ${endpoint}${status === undefined ? '' : `; HTTP ${status}`}${transportCode === undefined ? '' : `; ${transportCode}`}). No conversation was sent. No further protocol was attempted.`), {
    code: `APOPHISCODE_PROTOCOL_${kind}`, stage, protocol: api,
    ...(status === undefined ? {} : { status }), ...(transportCode === undefined ? {} : { transportCode }),
  })
}

/** Bound both headers and body, including a gateway that stalls after HTTP 200. */
async function readProbe(response, signal) {
  if (!response.body) return undefined
  const reader = response.body.getReader(), chunks = []
  let total = 0
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    signal.throwIfAborted()
    while (true) {
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      total += value.byteLength
      if (total > MAX_PROBE_BYTES) throw Object.assign(new Error('Protocol verification response exceeds the limit'), { code: 'APOPHISCODE_PROBE_RESPONSE_TOO_LARGE' })
      chunks.push(Buffer.from(value))
    }
    try { return JSON.parse(Buffer.concat(chunks, total).toString('utf8')) }
    catch { return undefined }
  } finally {
    signal.removeEventListener('abort', cancel)
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

function probe(api, id) {
  const message = { role: 'user', content: PROTOCOL_PROBE_TEXT }
  if (api === 'openai-responses') return { path: '/v1/responses', body: {
    model: id, input: [{ role: 'user', content: [{ type: 'input_text', text: PROTOCOL_PROBE_TEXT }] }],
    max_output_tokens: 128, store: false, prompt_cache_key: 'apophiscode-protocol-verification',
  }, valid: value => value?.status === 'completed' && value.output?.some(item => item.type === 'message'
    && item.content?.some(part => part.type === 'output_text' && part.text?.trim())) }
  if (api === 'anthropic-messages') return { path: '/v1/messages', body: { model: id, messages: [message], max_tokens: 128 },
    valid: value => value?.type === 'message' && value.content?.some(part => part.type === 'text' && part.text?.trim()) }
  if (api === 'openai-completions') return { path: '/v1/chat/completions', body: { model: id, messages: [message], max_tokens: 128 },
    valid: value => value?.choices?.some(choice => choice.message?.content?.trim()) }
  return { path: `/v1beta/models/${encodeURIComponent(id)}:generateContent`,
    body: { contents: [{ role: 'user', parts: [{ text: PROTOCOL_PROBE_TEXT }] }], generationConfig: { maxOutputTokens: 128 } },
    valid: value => value?.candidates?.some(item => item.content?.parts?.some(part => part.text?.trim())) }
}

/** An explicit protocol refusal is the only reason to try another independent probe. */
function protocolRefused(status, value) {
  if ([405, 415, 501].includes(status)) return true
  const detail = String(value?.error?.message ?? value?.message ?? '')
  return [400, 404, 422].includes(status) && /(?:unsupported|not supported|not found|unknown|不支持).*(?:protocol|endpoint|\/v1\/|responses|messages|completions)|(?:protocol|endpoint|responses|messages|completions).*(?:unsupported|not supported|not found|不支持)/iu.test(detail)
}

export function createModelProtocolResolver({ fetchImpl = ambientFetch, timeoutMs = 30_000, ttlMs = 10 * 60_000, now = Date.now } = {}) {
  const evidence = new Map(), pending = new Map()
  const identity = (host, key, id) => JSON.stringify([apiRootHost(host), createHash('sha256').update(key).digest('hex'), id])
  const cached = cacheKey => {
    const value = evidence.get(cacheKey)
    if (value !== undefined && now() - value.verifiedAt >= ttlMs) { evidence.delete(cacheKey); return undefined }
    return value
  }
  return Object.freeze({
    peek: ({ apiHost, key, id }) => cached(identity(apiHost, key, id)),
    async resolve({ apiHost, key, id, row, signal, referenceApi, requestedApi }) {
      signal?.throwIfAborted()
      const host = apiRootHost(apiHost), cacheKey = identity(host, key, id)
      const declared = declaredMetadata(row)
      if (requestedApi !== undefined) {
        if (!protocols.includes(requestedApi)) throw new Error('ApophisCode transport policy requested an unimplemented protocol')
        return { id, ...declared, api: requestedApi, source: 'plugin-policy' }
      }
      if (declared.api !== undefined) return { id, ...declared, source: 'gateway-declaration' }
      if (protocols.includes(referenceApi)) return { id, ...declared, api: referenceApi, source: 'sdk-reference' }
      const previous = cached(cacheKey)
      if (previous !== undefined) return { ...previous, ...declared }
      let task = pending.get(cacheKey)
      if (task === undefined) {
        task = (async () => {
          for (const api of protocols) {
            const request = probe(api, id)
            let response, value, requestSignal, stage = 'response-headers'
            try {
              requestSignal = AbortSignal.timeout(timeoutMs)
              response = await boundedFetch(`${host}${request.path}`, { method: 'POST',
                headers: { ...(api === 'google-generative-ai' ? { 'x-goog-api-key': key } : { authorization: `Bearer ${key}` }),
                  'content-type': 'application/json', accept: 'application/json',
                  ...(api === 'anthropic-messages' ? { 'anthropic-version': '2023-06-01' } : {}) },
                body: JSON.stringify(request.body),
              }, { fetchImpl, timeoutMs, signal: requestSignal })
              stage = 'response-body'
              value = await readProbe(response, requestSignal)
            } catch (error) {
              const rawCode = error?.code ?? error?.cause?.code
              const transportCode = TRANSPORT_CODES.has(rawCode) ? rawCode : undefined
              const tooLarge = rawCode === 'APOPHISCODE_PROBE_RESPONSE_TOO_LARGE'
              const deadlineExpired = requestSignal?.aborted === true || error?.timedOut === true
              const timedOut = deadlineExpired || ['UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'ETIMEDOUT'].includes(transportCode)
              throw verificationFailure(api, { stage, transportCode, status: response?.status,
                kind: tooLarge ? 'RESPONSE_TOO_LARGE' : transportCode === 'UND_ERR_CONNECT_TIMEOUT' ? 'CONNECT_TIMEOUT' : timedOut ? 'TIMEOUT' : 'TRANSPORT',
                detail: tooLarge ? 'response exceeded 64 KiB' : transportCode === 'UND_ERR_CONNECT_TIMEOUT' ? 'connection timed out'
                  : timedOut ? `timed out${deadlineExpired ? ` after ${timeoutMs / 1000}s` : ''} while waiting for ${stage === 'response-body' ? 'the response body' : 'response headers'}`
                    : `transport failed while waiting for ${stage === 'response-body' ? 'the response body' : 'response headers'}`,
              })
            }
            if (response.ok && !value?.error && request.valid(value)) {
              const verified = Object.freeze({ id, api, source: 'text-probe', verifiedAt: now() })
              evidence.set(cacheKey, verified)
              return verified
            }
            if (protocolRefused(response.status, value)) continue
            const upstream = redactSecrets(String(value?.error?.message ?? value?.message ?? ''), [key]).replace(/\s+/gu, ' ').slice(0, 300)
            throw verificationFailure(api, { kind: response.ok ? 'INVALID_RESPONSE' : 'HTTP', stage: 'response-validation', status: response.status,
              detail: response.ok ? `failed: the gateway did not return a completed text response${upstream === '' ? '' : ` — ${upstream}`}`
                : `failed: the gateway rejected the verification${upstream === '' ? '' : ` — ${upstream}`}` })
          }
          throw new Error('ApophisCode gateway rejected all implemented protocols for this exact model; no conversation was sent.')
        })().finally(() => pending.delete(cacheKey))
        pending.set(cacheKey, task)
      }
      return { ...await waitForSharedRequest(task, signal), ...declared }
    },
  })
}
