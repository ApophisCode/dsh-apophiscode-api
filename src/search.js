/**
 * ApophisCode web search for the DSH `web` seam.
 *
 * Two search providers register with `ctx.web`:
 * - `apophiscode-api` searches through ApophisCode for every request.
 * - `apophiscode-api-auto` searches through ApophisCode only when the initiating
 *   session runs on a ApophisCode model, and hands every other request to the
 *   provider DSH would have used without this plugin.
 *
 * The active key supplies exact model IDs. The selected model's verified
 * protocol determines the server-search encoding; structured search results
 * are required before reporting success. No model is substituted.
 *
 * @module dsh-apophiscode-api/search
 */

import { AsyncLocalStorage } from 'node:async_hooks'

import { HarnessError } from '@deepseek-ai/dsh-llm'

import { PROVIDER } from './constants.js'
import { classifyClientPolicy, classifyGatewayFailure, explainClientPolicyFailure } from './failures.js'
import { ambientFetch, boundedFetch } from './request.js'
import { redactSecrets } from './secret-redactor.js'
import { apiRootHost } from './hosts.js'
import { createModelProtocolResolver } from './model-protocol.js'

/** Search provider that always searches through ApophisCode. */
export const APOPHISCODE_SEARCH_PROVIDER_ID = 'apophiscode-api'
/** Search provider that routes by the initiating session's model provider. */
export const APOPHISCODE_AUTO_SEARCH_PROVIDER_ID = 'apophiscode-api-auto'
/** Both ids this plugin registers; neither may serve as its own fallback. */
export const OWN_SEARCH_PROVIDER_IDS = Object.freeze([APOPHISCODE_SEARCH_PROVIDER_ID, APOPHISCODE_AUTO_SEARCH_PROVIDER_ID])
/** DSH's built-in search provider, the fallback when nothing else is known. */
export const DSH_SEARCH_PROVIDER_FALLBACK = 'deepseek-official'

/** Search routing the user picks. */
export const SEARCH_MODE_DEFAULT = 'default'
export const SEARCH_MODE_AUTO = 'auto'
export const SEARCH_MODE_APOPHISCODE = 'apophiscode'
export const SEARCH_MODES = Object.freeze([SEARCH_MODE_DEFAULT, SEARCH_MODE_AUTO, SEARCH_MODE_APOPHISCODE])

/** Bound on one search request, below the `web_search` tool's 60 s budget. */
export const DEFAULT_SEARCH_TIMEOUT_MS = 55_000
/** Upper bound on server-side searches inside one DeepSeek request. */
const SEARCH_MAX_USES = 3
const MAX_OUTPUT_TOKENS = 4096
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_CONTENT_CHARS = 4000
const MAX_SNIPPET_CHARS = 500
const MAX_TITLE_CHARS = 200
const MAX_SOURCES = 20
const MAX_ERROR_DETAIL_CHARS = 400

/**
 * Error shape of the DSH web seam. `@deepseek-ai/dsh-web` defines `WebError`
 * as a bare `HarnessError` subclass with a machine-routable `code`; consumers
 * route on that code, so this mirror avoids a peer dependency on the package.
 */
export class WebError extends HarnessError {}

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => (typeof value === 'string' ? value : '')

function bounded(value, maximum) {
  const clean = text(value).replace(/\s+/gu, ' ').trim()
  if (clean === '') return undefined
  return clean.length <= maximum ? clean : `${clean.slice(0, maximum - 1)}…`
}

function boundedBlock(value, maximum) {
  const clean = text(value).trim()
  if (clean === '') return undefined
  return clean.length <= maximum ? clean : `${clean.slice(0, maximum - 1)}…`
}

function httpUrl(value) {
  const url = text(value)
  if (url === '') return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : undefined
  } catch {
    return undefined
  }
}

/** Accumulates sources by URL, first sighting wins, missing fields filled later. */
function sourceList() {
  const byUrl = new Map()
  return {
    add({ url, title, snippet, publishedAt }) {
      const parsed = httpUrl(url)
      if (parsed === undefined) return
      const key = parsed.href
      const existing = byUrl.get(key)
      if (existing === undefined) {
        if (byUrl.size >= MAX_SOURCES) return
        byUrl.set(key, {
          url: text(url),
          title: bounded(title, MAX_TITLE_CHARS) ?? parsed.hostname,
          ...(bounded(snippet, MAX_SNIPPET_CHARS) === undefined ? {} : { snippet: bounded(snippet, MAX_SNIPPET_CHARS) }),
          ...(bounded(publishedAt, 64) === undefined ? {} : { publishedAt: bounded(publishedAt, 64) }),
        })
        return
      }
      if (existing.title === parsed.hostname && bounded(title, MAX_TITLE_CHARS) !== undefined) existing.title = bounded(title, MAX_TITLE_CHARS)
      if (existing.snippet === undefined && bounded(snippet, MAX_SNIPPET_CHARS) !== undefined) existing.snippet = bounded(snippet, MAX_SNIPPET_CHARS)
      if (existing.publishedAt === undefined && bounded(publishedAt, 64) !== undefined) existing.publishedAt = bounded(publishedAt, 64)
    },
    values: () => [...byUrl.values()],
  }
}

function result(sources, content) {
  return {
    ...(content === undefined ? {} : { content }),
    sources,
    truncated: false,
  }
}

/**
 * Map an Anthropic Messages response with native search to a search result.
 * Sources come from `web_search_tool_result` blocks; a text block's citation
 * excerpt becomes its source's snippet; the answer text becomes `content`.
 * @param response - parsed Messages response body.
 * @returns the normalized search result.
 * @throws {WebError} when the response carries no search result block.
 */
export function parseMessagesSearchResponse(response) {
  const blocks = Array.isArray(response?.content) ? response.content : []
  const resultBlocks = blocks.filter(block => block?.type === 'web_search_tool_result')
  if (resultBlocks.length === 0) {
    throw new WebError('ApophisCode search returned no web_search_tool_result block; the model did not run a web search', 'WEB_PROVIDER_ERROR')
  }
  const sources = sourceList()
  const errors = []
  for (const block of resultBlocks) {
    if (!Array.isArray(block.content)) {
      if (record(block.content) && text(block.content.error_code) !== '') errors.push(block.content.error_code)
      continue
    }
    for (const item of block.content) {
      if (item?.type !== 'web_search_result') continue
      sources.add({ url: item.url, title: item.title, publishedAt: item.page_age })
    }
  }
  for (const block of blocks) {
    if (block?.type !== 'text' || !Array.isArray(block.citations)) continue
    for (const cite of block.citations) sources.add({ url: cite?.url, title: cite?.title, snippet: cite?.cited_text })
  }
  const found = sources.values()
  if (found.length === 0 && errors.length > 0) {
    throw new WebError(`ApophisCode search failed upstream (${errors.join(', ')})`, 'WEB_PROVIDER_ERROR')
  }
  const answer = boundedBlock(blocks.filter(block => block?.type === 'text').map(block => text(block.text)).join(''), MAX_CONTENT_CHARS)
  return result(found, answer)
}

/**
 * Map an OpenAI Responses response with the hosted search tool to a search
 * result. Cited URLs come first with their titles, then every other URL the
 * search actions surfaced; the final message becomes `content`.
 * @param response - parsed Responses body.
 * @returns the normalized search result.
 * @throws {WebError} when the model ran no web search.
 */
export function parseResponsesSearchResponse(response) {
  const output = Array.isArray(response?.output) ? response.output : []
  const calls = output.filter(item => item?.type === 'web_search_call')
  if (calls.length === 0) {
    throw new WebError('ApophisCode search returned no web_search_call; the model did not run a web search', 'WEB_PROVIDER_ERROR')
  }
  const sources = sourceList()
  let answer
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue
    const parts = []
    for (const part of item.content) {
      if (part?.type !== 'output_text') continue
      parts.push(text(part.text))
      for (const annotation of Array.isArray(part.annotations) ? part.annotations : []) {
        if (annotation?.type === 'url_citation') sources.add({ url: annotation.url, title: annotation.title })
      }
    }
    const joined = parts.join('')
    if (joined.trim() !== '') answer = joined
  }
  for (const call of calls) {
    const action = record(call.action) ? call.action : {}
    if (text(action.url) !== '') sources.add({ url: action.url })
    for (const source of Array.isArray(action.sources) ? action.sources : []) sources.add({ url: source?.url, title: source?.title })
  }
  return result(sources.values(), boundedBlock(answer, MAX_CONTENT_CHARS))
}

/** Build one backend's request; the key is attached by the caller. */
export function buildSearchRequest(backend, { apiHost, model, query, sessionId }) {
  const root = apiRootHost(apiHost)
  if (typeof model !== 'string' || model === '') throw new WebError('ApophisCode search needs an active-key model', 'WEB_PROVIDER_UNAVAILABLE')
  if (backend === 'openai-responses') {
    return {
      url: `${root}/v1/responses`,
      model,
      headers: key => ({ authorization: `Bearer ${key}` }),
      body: {
        model,
        // The Codex group refuses a bare string input on some channels.
        input: [{
          role: 'user',
          content: [{
            type: 'input_text',
            text: `Search the web for: ${query}\n\nReply with a concise factual summary of what the sources say, citing them.`,
          }],
        }],
        tools: [{ type: 'web_search' }],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
        ...(typeof sessionId === 'string' && sessionId !== '' ? { prompt_cache_key: sessionId } : {}),
      },
      parse: parseResponsesSearchResponse,
    }
  }
  if (backend === 'anthropic-messages') {
    return {
      url: `${root}/v1/messages`,
      model,
      headers: key => ({ authorization: `Bearer ${key}`, 'anthropic-version': ANTHROPIC_VERSION }),
      body: {
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [{
          role: 'user',
          content: `Perform a web search for the query: ${query}\n\nThen reply with a concise factual summary of what the results say.`,
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_MAX_USES }],
      },
      parse: parseMessagesSearchResponse,
    }
  }
  throw new WebError(`ApophisCode search backend "${String(backend)}" is not supported`, 'WEB_PROVIDER_UNAVAILABLE')
}

/** Read a failure body as bounded text, preferring the gateway's own message. */
async function failureText(response) {
  let raw = ''
  try {
    raw = await response.text()
  } catch {
    return ''
  }
  try {
    const parsed = JSON.parse(raw)
    const message = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message ?? parsed?.message
    if (typeof message === 'string' && message !== '') {
      const code = typeof parsed?.error?.code === 'string' && parsed.error.code !== '' ? `${parsed.error.code}: ` : ''
      return `${code}${message}`.slice(0, MAX_ERROR_DETAIL_CHARS)
    }
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return raw.replace(/\s+/gu, ' ').trim().slice(0, MAX_ERROR_DETAIL_CHARS)
}

const mask = (message, key) => redactSecrets(message, [key])

function isAbort(error, signal) {
  return signal?.aborted === true || error?.name === 'AbortError'
}

/**
 * Create the provider that searches through ApophisCode on every request.
 * @param options - the key ring, the host resolution, the backend preference,
 *   the key-failure sink shared with the model route, and test seams.
 * @returns a DSH web search provider.
 */
export function createApophisCodeSearchProvider({
  ring,
  hosts,
  selectedModel = () => '',
  availableModels = async () => [],
  protocols = createModelProtocolResolver(),
  onKeyFailure,
  resolveSessionId,
  fetchImpl = ambientFetch,
  timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
} = {}) {
  if (ring === undefined || typeof ring.activeKey !== 'function') throw new Error('ApophisCode search requires the key ring')
  if (typeof hosts !== 'function') throw new Error('ApophisCode search requires the host resolution')

  /** One request with one key; classified failures come back as values. */
  const attempt = async (request, key, signal) => {
    // Key resolution is asynchronous; the caller may have given up meanwhile.
    if (signal?.aborted === true) throw new WebError('ApophisCode search aborted', 'WEB_ABORTED', { cause: signal.reason })
    let response
    try {
      response = await boundedFetch(request.url, {
        method: 'POST',
        headers: {
          ...request.headers(key),
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(request.body),
      }, { fetchImpl, timeoutMs, signal })
    } catch (error) {
      if (error.aborted) throw new WebError('ApophisCode search aborted', 'WEB_ABORTED')
      if (error.timedOut) throw new WebError(`ApophisCode search got no answer within ${Math.round(timeoutMs / 1000)}s`, 'WEB_PROVIDER_ERROR')
      throw new WebError(`ApophisCode search request failed (${mask(error.code ?? error.message, key)})`, 'WEB_PROVIDER_ERROR')
    }
    if (!response.ok) return { failure: mask(await failureText(response), key), status: response.status }
    let body
    try {
      body = await response.json()
    } catch (error) {
      if (isAbort(error, signal)) throw new WebError('ApophisCode search aborted', 'WEB_ABORTED')
      throw new WebError('ApophisCode search returned an unreadable response', 'WEB_PROVIDER_ERROR')
    }
    // Some gateway channels answer 200 with an error object.
    if (record(body?.error)) return { failure: mask(text(body.error.message) || JSON.stringify(body.error).slice(0, MAX_ERROR_DETAIL_CHARS), key), status: response.status }
    try {
      const parsed = request.parse(body)
      return { value: {
        ...parsed,
        ...(parsed.content === undefined ? {} : { content: mask(parsed.content, key) }),
        sources: parsed.sources.map(source => Object.fromEntries(Object.entries(source).map(([name, value]) => [name, typeof value === 'string' ? mask(value, key) : value]))),
      } }
    } catch (error) {
      throw new WebError(mask(error instanceof Error ? error.message : String(error), key), 'WEB_PROVIDER_ERROR')
    }
  }

  return Object.freeze({
    id: APOPHISCODE_SEARCH_PROVIDER_ID,
    available: () => true,
    async search(searchRequest, signal) {
      if (signal?.aborted === true) throw new WebError('ApophisCode search aborted', 'WEB_ABORTED', { cause: signal.reason })
      const query = text(searchRequest?.query).trim()
      if (query === '') throw new WebError('ApophisCode search needs a non-empty query', 'WEB_PROVIDER_ERROR')
      const key = await ring.activeKey()
      if (key === undefined) throw new WebError('ApophisCode search has no usable API key; add one under Settings → ApophisCode', 'WEB_PROVIDER_CREDENTIAL_MISSING')
      const apiHost = hosts().apiHost
      let rows, metadata
      try {
        rows = await availableModels({ entry: key, apiHost, signal })
      } catch {
        throw new WebError('ApophisCode search model list could not be read', signal?.aborted ? 'WEB_ABORTED' : 'WEB_PROVIDER_UNAVAILABLE')
      }
      const id = selectedModel() || rows[0]?.id
      const row = rows.find(item => item.id === id)
      if (row === undefined) throw new WebError('ApophisCode search model is absent from the active key model list', 'WEB_PROVIDER_UNAVAILABLE')
      try {
        metadata = await protocols.resolve({ apiHost, key: key.key, id, row, signal })
      } catch {
        throw new WebError('ApophisCode search protocol verification could not complete; no search was sent', signal?.aborted ? 'WEB_ABORTED' : 'WEB_PROVIDER_UNAVAILABLE')
      }
      const request = buildSearchRequest(metadata.api, { apiHost, model: id, query,
        sessionId: searchRequest?.sessionId ?? resolveSessionId?.() })
      const outcome = await attempt(request, key.key, signal)
      if (outcome.value !== undefined) return outcome.value
      if (classifyClientPolicy(outcome.failure)) throw new WebError(explainClientPolicyFailure(outcome.failure), 'WEB_PROVIDER_ERROR')
      const kind = classifyGatewayFailure(outcome.failure) ?? (outcome.status === 401 ? 'invalid-key' : undefined)
      if (kind !== undefined) onKeyFailure?.(kind, outcome.failure, key.key, key.id)
      throw new WebError(`ApophisCode search failed (HTTP ${outcome.status}): ${outcome.failure}`, 'WEB_PROVIDER_ERROR')
    },
  })
}

/** Marks a request already passing through the auto provider's fallback. */
const delegating = new AsyncLocalStorage()

/**
 * Create the provider that searches through ApophisCode for ApophisCode sessions
 * only. Every other request goes to the fallback provider: the search provider
 * the web row selected before this plugin's patch, or DSH's built-in search.
 *
 * Another plugin's router may delegate back to this one (its own fallback is
 * the web row's base, which this plugin's patch points here). A request that
 * re-enters while already delegating goes straight to DSH's built-in search
 * instead of looping.
 * @param options - the ApophisCode provider, the initiating model provider, a
 *   lookup of registered search providers, and the fallback id.
 * @returns a DSH web search provider.
 */
export function createApophisCodeAutoSearchProvider({ apophiscode, resolveModelProvider, resolveProvider, resolveFallbackId }) {
  return Object.freeze({
    id: APOPHISCODE_AUTO_SEARCH_PROVIDER_ID,
    available: () => true,
    async search(request, signal) {
      if (resolveModelProvider?.() === PROVIDER) return apophiscode.search(request, signal)
      const reentered = delegating.getStore() === true
      const wanted = reentered ? DSH_SEARCH_PROVIDER_FALLBACK : (resolveFallbackId?.() ?? DSH_SEARCH_PROVIDER_FALLBACK)
      const id = OWN_SEARCH_PROVIDER_IDS.includes(wanted) ? DSH_SEARCH_PROVIDER_FALLBACK : wanted
      const provider = resolveProvider?.(id)
      if (provider === undefined || OWN_SEARCH_PROVIDER_IDS.includes(provider.id) || provider.available?.() !== true) {
        throw new WebError(`ApophisCode auto search: the fallback search provider "${id}" is unavailable`, 'WEB_PROVIDER_UNAVAILABLE')
      }
      return delegating.run(true, () => provider.search(request, signal))
    },
  })
}
