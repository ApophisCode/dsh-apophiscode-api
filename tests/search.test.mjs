import assert from 'node:assert/strict'
import test from 'node:test'

import { ApophisCodeKeyRing } from '../src/key-ring.js'
import {
  buildSearchRequest,
  createApophisCodeAutoSearchProvider,
  createApophisCodeSearchProvider as dynamicSearchProvider,
  APOPHISCODE_AUTO_SEARCH_PROVIDER_ID,
  APOPHISCODE_SEARCH_PROVIDER_ID,
  parseMessagesSearchResponse,
  parseResponsesSearchResponse,
  WebError,
} from '../src/search.js'
import { fakeCredentials } from './helpers.mjs'

const SEARCH_ROWS = [{ id: 'search-alpha', api: 'anthropic-messages' }, { id: 'search-beta', api: 'openai-responses' }]
// Explicit server declarations supplied by this offline gateway fixture.
const createApophisCodeSearchProvider = options => dynamicSearchProvider({
  availableModels: async () => SEARCH_ROWS, selectedModel: () => SEARCH_ROWS[0].id, ...options,
})

async function ringWith(...keys) {
  const ring = new ApophisCodeKeyRing(fakeCredentials())
  for (const [index, key] of keys.entries()) await ring.add(key, `k${index + 1}`)
  return ring
}

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
})

/** The block shape `deepseek-flash` answered with through ApophisCode's `/v1/messages`. */
const MESSAGES_ANSWER = {
  type: 'message',
  role: 'assistant',
  model: 'deepseek-flash',
  content: [
    { type: 'thinking', thinking: '…', signature: 'sig' },
    { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'DeepSeek Harness desktop app' } },
    {
      type: 'web_search_tool_result',
      tool_use_id: 'srv_1',
      content: [
        { type: 'web_search_result', title: 'DeepSeek Harness Desktop Preview', url: 'https://eu.36kr.com/en/p/3998199345500040#1', encrypted_content: 'x'.repeat(64), page_age: null },
        { type: 'web_search_result', title: '下载 DeepSeek', url: 'https://www.deepseek.com/download/', encrypted_content: 'y', page_age: 'June 1, 2026' },
        { type: 'web_search_result', title: 'duplicate', url: 'https://www.deepseek.com/download/', encrypted_content: 'z' },
        { type: 'web_search_result', title: 'not http', url: 'javascript:alert(1)' },
      ],
    },
    { type: 'thinking', thinking: '…', signature: 'sig' },
    { type: 'text', text: 'The desktop preview ', citations: [] },
    { type: 'text', text: 'launched.', citations: [{ type: 'web_search_result_location', url: 'https://www.deepseek.com/download/', title: '下载 DeepSeek', cited_text: 'Download the DeepSeek Harness desktop app.' }] },
  ],
  usage: { input_tokens: 8920, output_tokens: 891, server_tool_use: { web_search_requests: 1 } },
}

/** The item shape `gpt-6.1-sol` answered with through ApophisCode's `/v1/responses`. */
const RESPONSES_ANSWER = {
  output: [
    { type: 'message', content: [{ type: 'output_text', text: 'I’ll check Node.js’s release announcements.', annotations: [] }] },
    { type: 'web_search_call', status: 'completed', action: { type: 'search', query: 'latest Node.js release', sources: [{ type: 'url', url: 'https://nodejs.org/en/blog' }, { type: 'url', url: 'https://github.com/nodejs/node/releases' }] } },
    { type: 'web_search_call', status: 'completed', action: { type: 'open_page', url: 'https://nodejs.org/en/blog/release/v26.11.1' } },
    {
      type: 'message',
      content: [{
        type: 'output_text',
        text: 'Node.js 26.11.1 (Current), announced October 7, 2026 — https://nodejs.org/en/blog/release/v26.11.1 ([nodejs.org](https://nodejs.org/en/blog/release/v26.11.1))',
        annotations: [{ type: 'url_citation', url: 'https://nodejs.org/en/blog/release/v26.11.1', title: 'Node.js — Node.js 26.11.1 (Current)', start_index: 100, end_index: 160 }],
      }],
    },
  ],
}

test('a Messages answer maps its result blocks to sources and its text to content', () => {
  const result = parseMessagesSearchResponse(MESSAGES_ANSWER)
  assert.deepEqual(result.sources, [
    { url: 'https://eu.36kr.com/en/p/3998199345500040#1', title: 'DeepSeek Harness Desktop Preview' },
    { url: 'https://www.deepseek.com/download/', title: '下载 DeepSeek', snippet: 'Download the DeepSeek Harness desktop app.', publishedAt: 'June 1, 2026' },
  ])
  assert.equal(result.content, 'The desktop preview launched.')
  assert.equal(result.truncated, false)
  // Encrypted page content never reaches the result.
  assert.doesNotMatch(JSON.stringify(result), /encrypted|xxxx/u)
})

test('a Messages answer without a search block is an error, not prose scraping', () => {
  assert.throws(
    () => parseMessagesSearchResponse({ content: [{ type: 'text', text: 'see https://example.com' }] }),
    error => error instanceof WebError && error.code === 'WEB_PROVIDER_ERROR' && /did not run a web search/u.test(error.message),
  )
  assert.throws(
    () => parseMessagesSearchResponse({ content: [{ type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } }] }),
    /max_uses_exceeded/u,
  )
})

test('a Responses answer lists cited sources first, then the URLs its search actions saw', () => {
  const result = parseResponsesSearchResponse(RESPONSES_ANSWER)
  assert.deepEqual(result.sources.map(source => source.url), [
    'https://nodejs.org/en/blog/release/v26.11.1',
    'https://nodejs.org/en/blog',
    'https://github.com/nodejs/node/releases',
  ])
  assert.equal(result.sources[0].title, 'Node.js — Node.js 26.11.1 (Current)')
  // A URL without a title is labelled with its host.
  assert.equal(result.sources[1].title, 'nodejs.org')
  // The final message is the answer; the preamble is not.
  assert.match(result.content, /^Node\.js 26\.11\.1 \(Current\)/u)
  assert.throws(() => parseResponsesSearchResponse({ output: [RESPONSES_ANSWER.output[3]] }), /did not run a web search/u)
})

test('each backend builds its own protocol request against the configured host', () => {
  const deepseek = buildSearchRequest('anthropic-messages', { model: 'search-alpha', apiHost: 'https://gw.example', query: 'q', sessionId: 's1' })
  assert.equal(deepseek.url, 'https://gw.example/v1/messages')
  assert.deepEqual(deepseek.headers('sk-1'), { authorization: 'Bearer sk-1', 'anthropic-version': '2023-06-01' })
  assert.equal(deepseek.body.model, 'search-alpha')
  assert.deepEqual(deepseek.body.tools, [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }])
  assert.match(deepseek.body.messages[0].content, /^Perform a web search for the query: q/u)

  const gpt = buildSearchRequest('openai-responses', { model: 'search-beta', apiHost: 'https://gw.example', query: 'q', sessionId: 's1' })
  assert.equal(gpt.url, 'https://gw.example/v1/responses')
  assert.deepEqual(gpt.headers('sk-1'), { authorization: 'Bearer sk-1' })
  assert.equal(gpt.body.model, 'search-beta')
  assert.deepEqual(gpt.body.tools, [{ type: 'web_search' }])
  assert.equal(gpt.body.tool_choice, 'required')
  assert.equal(gpt.body.store, false)
  assert.equal(gpt.body.prompt_cache_key, 's1')
  // The Codex group refuses a bare string input on some channels.
  assert.ok(Array.isArray(gpt.body.input))

  assert.throws(() => buildSearchRequest('bing', { model: 'search-alpha', apiHost: 'https://gw.example', query: 'q' }), /not supported/u)
})

test('a search authenticates with the active ring key only and refuses redirects', async () => {
  const ring = await ringWith('sk-first-key-0001', 'sk-second-key-0002')
  const calls = []
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return json(200, MESSAGES_ANSWER)
    },
  })
  assert.equal(provider.id, APOPHISCODE_SEARCH_PROVIDER_ID)
  assert.equal(provider.available(), true)
  const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 5 })
  assert.equal(result.sources.length, 2)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://gw.example/v1/messages')
  assert.equal(calls[0].init.redirect, 'error')
  assert.equal(calls[0].init.headers.authorization, 'Bearer sk-first-key-0001')
  assert.ok(calls[0].init.signal instanceof AbortSignal)
})

test('a configured gateway prefix and API suffix reach the final search URL exactly once', async () => {
  const ring = await ringWith('sk-fixture-search-root-key')
  for (const [backend, endpoint] of [['search-alpha', 'messages'], ['search-beta', 'responses']]) {
    for (const suffix of ['', '/v1', '/v1beta/']) {
      const provider = createApophisCodeSearchProvider({ ring, selectedModel: () => backend,
        hosts: () => ({ apiHost: `https://gateway.example/tenant${suffix}` }),
        fetchImpl: async (url, init) => {
          assert.equal(url, `https://gateway.example/tenant/v1/${endpoint}`)
          assert.equal(init.redirect, 'error')
          return json(200, backend === 'search-beta' ? RESPONSES_ANSWER : MESSAGES_ANSWER)
        },
      })
      assert.ok((await provider.search({ query: 'q' })).sources.length > 0)
    }
  }
})

test('the backend preference is read per search', async () => {
  const ring = await ringWith('sk-first-key-0001')
  let backend = 'search-alpha'
  const urls = []
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    selectedModel: () => backend,
    fetchImpl: async url => {
      urls.push(url)
      return json(200, url.endsWith('/responses') ? RESPONSES_ANSWER : MESSAGES_ANSWER)
    },
  })
  await provider.search({ query: 'a' })
  backend = 'search-beta'
  await provider.search({ query: 'b' })
  backend = 'unknown'
  await assert.rejects(provider.search({ query: 'c' }), error => error.code === 'WEB_PROVIDER_UNAVAILABLE')
  assert.deepEqual(urls, ['https://gw.example/v1/messages', 'https://gw.example/v1/responses'])
})

test('an exhausted key moves aside through the shared sink and the next key answers', async () => {
  const ring = await ringWith('sk-first-key-0001', 'sk-second-key-0002')
  const failures = []
  const used = []
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    onKeyFailure: (kind, message, key, id) => {
      failures.push({ kind, key, id })
      void ring.disable(id, kind)
    },
    fetchImpl: async (_url, init) => {
      used.push(init.headers.authorization)
      return init.headers.authorization === 'Bearer sk-first-key-0001'
        ? json(403, { error: { message: '该令牌额度已用尽', type: 'gateway_api_error' } })
        : json(200, MESSAGES_ANSWER)
    },
  })
  await assert.rejects(provider.search({ query: 'q' }), /HTTP 403/u)
  assert.deepEqual(used, ['Bearer sk-first-key-0001'])
  await ring.activeKey()
  const result = await provider.search({ query: 'q' })
  assert.equal(result.sources.length, 2)
  assert.deepEqual(used, ['Bearer sk-first-key-0001', 'Bearer sk-second-key-0002'])
  assert.equal(failures.length, 1)
  assert.equal(failures[0].kind, 'quota')
  assert.equal(failures[0].key, 'sk-first-key-0001')
  assert.equal(typeof failures[0].id, 'string')
})

test('a key whose group does not cover the search model is skipped but never disabled', async () => {
  const ring = await ringWith('sk-first-key-0001', 'sk-second-key-0002')
  const failures = []
  let calls = 0
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    selectedModel: () => 'search-beta',
    onKeyFailure: kind => failures.push(kind),
    fetchImpl: async () => {
      calls += 1
      return json(400, { error: { code: 'model_not_found', message: '当前令牌未覆盖供应商 "OpenAI"（模型=gpt-6.1-sol，已选分组=[codex]）', type: 'gateway_api_error' } })
    },
  })
  await assert.rejects(provider.search({ query: 'q' }), error => {
    assert.equal(error.code, 'WEB_PROVIDER_ERROR')
    assert.match(error.message, /model_not_found/u)
    return true
  })
  assert.equal(calls, 1)
  assert.deepEqual(failures, [])
  assert.equal((await ring.list()).keys.every(key => !key.disabled), true)
})

test('a client-policy refusal is explained and blames no key', async () => {
  const ring = await ringWith('sk-first-key-0001')
  const failures = []
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    onKeyFailure: kind => failures.push(kind),
    fetchImpl: async () => json(403, { error: { message: '请使用标准 codex 客户端' } }),
  })
  await assert.rejects(provider.search({ query: 'q' }), /返回了客户端策略拒绝/u)
  assert.deepEqual(failures, [])
})

test('other failures name the status and never echo the key', async () => {
  const ring = await ringWith('sk-secret-key-123456')
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    fetchImpl: async () => json(500, { error: { message: 'upstream exploded for sk-secret-key-123456' } }),
  })
  await assert.rejects(provider.search({ query: 'q' }), error => {
    assert.equal(error.code, 'WEB_PROVIDER_ERROR')
    assert.match(error.message, /HTTP 500/u)
    assert.doesNotMatch(error.message, /sk-secret-key-123456/u)
    assert.match(error.message, /\[redacted\]/u)
    return true
  })
})

test('no stored key, an empty query, and a cancelled search fail with their own codes', async () => {
  const empty = createApophisCodeSearchProvider({
    ring: await ringWith(),
    hosts: () => ({ apiHost: 'https://gw.example' }),
    fetchImpl: async () => assert.fail('no request without a key'),
  })
  await assert.rejects(empty.search({ query: 'q' }), error => error.code === 'WEB_PROVIDER_CREDENTIAL_MISSING' && /Settings → ApophisCode/u.test(error.message))
  await assert.rejects(empty.search({ query: '  ' }), /non-empty query/u)

  const ring = await ringWith('sk-first-key-0001')
  let started
  const fetching = new Promise(resolve => { started = resolve })
  const slow = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    // Like fetch: an already-aborted signal rejects at once, a later abort rejects then.
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      const abort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      if (init.signal.aborted) return abort()
      init.signal.addEventListener('abort', abort)
      started()
    }),
  })
  const controller = new AbortController()
  const pending = slow.search({ query: 'q' }, controller.signal)
  await fetching
  controller.abort()
  await assert.rejects(pending, error => error.code === 'WEB_ABORTED')
  // Cancelled while the key was still being resolved: no request goes out.
  const early = new AbortController()
  const beforeFetch = slow.search({ query: 'q' }, early.signal)
  early.abort()
  await assert.rejects(beforeFetch, error => error.code === 'WEB_ABORTED')
  const aborted = new AbortController()
  aborted.abort()
  await assert.rejects(slow.search({ query: 'q' }, aborted.signal), error => error.code === 'WEB_ABORTED')
})

test('a request that never answers is bounded by the search timeout', async t => {
  // AbortSignal.timeout does not keep the event loop alive, and this fake
  // fetch holds nothing open; in a host process something always does. Node
  // 22's runner would otherwise see an idle loop and cancel the file.
  const keepAlive = setInterval(() => {}, 1_000)
  t.after(() => clearInterval(keepAlive))
  const ring = await ringWith('sk-first-key-0001')
  const provider = createApophisCodeSearchProvider({
    ring,
    hosts: () => ({ apiHost: 'https://gw.example' }),
    timeoutMs: 20,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      const abort = () => reject(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))
      if (init.signal.aborted) return abort()
      init.signal.addEventListener('abort', abort)
    }),
  })
  await assert.rejects(provider.search({ query: 'q' }), error => error.code === 'WEB_PROVIDER_ERROR' && /no answer within/u.test(error.message))
})

function stubProvider(id, answer) {
  const seen = []
  return {
    id,
    seen,
    available: () => true,
    async search(request) {
      seen.push(request.query)
      return typeof answer === 'function' ? answer(request) : answer
    },
  }
}

test('auto search serves ApophisCode sessions itself and hands every other request to the fallback', async () => {
  const apophiscode = stubProvider(APOPHISCODE_SEARCH_PROVIDER_ID, { sources: [{ url: 'https://p.example' }], truncated: false })
  const fallback = stubProvider('kimi-subscription', { sources: [{ url: 'https://k.example' }], truncated: false })
  let modelProvider = 'apophiscode'
  const auto = createApophisCodeAutoSearchProvider({
    apophiscode,
    resolveModelProvider: () => modelProvider,
    resolveProvider: id => (id === fallback.id ? fallback : undefined),
    resolveFallbackId: () => 'kimi-subscription',
  })
  assert.equal(auto.id, APOPHISCODE_AUTO_SEARCH_PROVIDER_ID)
  assert.equal((await auto.search({ query: 'one' })).sources[0].url, 'https://p.example')
  modelProvider = 'anthropic'
  assert.equal((await auto.search({ query: 'two' })).sources[0].url, 'https://k.example')
  assert.deepEqual(apophiscode.seen, ['one'])
  assert.deepEqual(fallback.seen, ['two'])
})

test('auto search never falls back to itself, and a router that loops back reaches DSH search', async () => {
  const apophiscode = stubProvider(APOPHISCODE_SEARCH_PROVIDER_ID, { sources: [], truncated: false })
  const dsh = stubProvider('deepseek-official', { sources: [{ url: 'https://d.example' }], truncated: false })
  const providers = new Map([[dsh.id, dsh]])
  let auto
  // A foreign router whose own fallback is the web row's base — this plugin.
  const router = stubProvider('kimi-subscription-auto', request => auto.search(request))
  providers.set(router.id, router)
  let fallbackId = APOPHISCODE_AUTO_SEARCH_PROVIDER_ID
  auto = createApophisCodeAutoSearchProvider({
    apophiscode,
    resolveModelProvider: () => 'anthropic',
    resolveProvider: id => providers.get(id),
    resolveFallbackId: () => fallbackId,
  })
  assert.equal((await auto.search({ query: 'self' })).sources[0].url, 'https://d.example')
  fallbackId = 'kimi-subscription-auto'
  assert.equal((await auto.search({ query: 'loop' })).sources[0].url, 'https://d.example')
  assert.deepEqual(router.seen, ['loop'])
  assert.deepEqual(dsh.seen, ['self', 'loop'])

  fallbackId = 'missing-provider'
  await assert.rejects(auto.search({ query: 'x' }), error => error.code === 'WEB_PROVIDER_UNAVAILABLE' && /missing-provider/u.test(error.message))
})

test('search success fields and structured parser errors redact a gateway-echoed credential', async () => {
  const key = 'sk-secret-key-search-redaction'
  const ring = await ringWith(key)
  const good = structuredClone(MESSAGES_ANSWER)
  good.content.push({ type: 'text', text: key })
  good.content.push({ type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: `https://example.com/${key}`, title: key }] })
  const provider = createApophisCodeSearchProvider({ ring, hosts: () => ({ apiHost: 'https://gw.example' }), fetchImpl: async () => json(200, good) })
  const value = await provider.search({ query: 'q' })
  assert.equal(JSON.stringify(value).includes(key), false)
  assert.match(value.content, /\[redacted\]/u)
  const failed = createApophisCodeSearchProvider({ ring, hosts: () => ({ apiHost: 'https://gw.example' }), fetchImpl: async () => json(200, { content: [{ type: 'web_search_tool_result', content: { error_code: key } }] }) })
  await assert.rejects(failed.search({ query: 'q' }), error => {
    assert.equal(String(error).includes(key), false)
    assert.match(error.message, /\[redacted\]/u)
    return true
  })
})
