import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import TestRenderer from 'react-test-renderer'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'

import { apply } from '../src/index.js'
import { zh } from '../src/client-copy.js'

const { act, create } = TestRenderer
const settle = () => act(async () => { await new Promise(resolve => setImmediate(resolve)) })
const text = node => typeof node === 'string' ? node : node.children.map(text).join('')
const DEEPSEEK = ['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-0731', 'deepseek-v4-pro', 'deepseek-v4.1-flash']
const GPT = ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-future-unknown']
const TEST_KEYS = { deepseek: 'sk-offline-model-refresh-deepseek', gpt: 'sk-offline-model-refresh-gpt' }

/** Built settings UI -> registered RPC -> isolated records and real DSH model registry. */
async function settingsFixture(t, { initialKeys = Object.keys(TEST_KEYS), beforeCall, beforeReply, directoryEntries, usageReply } = {}) {
  const records = new Map(), calls = [], slots = new Map(), disposers = []
  const runtimeContext = new Context()
  const llm = new LlmRuntime(runtimeContext)
  let handler, preferences = {}
  const settings = {
    writable: true,
    configure: () => () => {},
    installSection(_ctx, _ns, _schema, _source, hooks) {
      hooks.setSource(() => preferences)
      settings.onChange = hooks.onChange
    },
    async update(_id, patch) {
      preferences = { ...preferences, ...patch }
      settings.onChange()
    },
  }
  const ctx = {
    credentials: {
      async readRecord(id) { return records.get(id) },
      async modifyRecord(id, mutate) {
        const next = await mutate(records.get(id))
        if (next !== undefined) records.set(id, next)
        return records.get(id)
      },
    },
    llm, logger: { warn() {}, info() {} }, get: () => undefined,
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    inject(names, callback) {
      if (names.includes('settings')) callback({ settings, effect: ctx.effect })
      if (names.includes('connection')) callback({ effect: ctx.effect, connection: { rpc: {
        handle(channel, registered) {
          assert.equal(channel, '/apophiscode-api')
          handler = registered
          return () => {}
        },
      } } })
    },
  }
  const directories = new Map(directoryEntries ?? [[TEST_KEYS.deepseek, DEEPSEEK], [TEST_KEYS.gpt, GPT]])
  const directoriesByHost = new Map()
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    const path = new URL(request.url).pathname
    if (path === '/v1/models') {
      const source = directoriesByHost.get(new URL(request.url).origin) ?? directories
      const ids = source.get(request.headers.get('authorization')?.replace(/^Bearer /u, ''))
      if (ids === null) return new Response('offline discovery unavailable', { status: 503 })
      assert.ok(ids, 'only explicit offline fixture credentials reach discovery')
      return Response.json({ data: ids.map(id => ({ id })) })
    }
    if (path === '/api/v1/model-plaza') return Response.json({ code: 0, data: { groups: [] } })
    if (path === '/v1/usage') return usageReply?.(request) ?? Response.json({ remaining: 10, unit: 'USD' })
    assert.fail(`unexpected fixture request: ${path}`)
  })
  apply(ctx, { claudeTransport: 'http', claudeCliPath: '/nonexistent/apophiscode-test-cli' })
  for (const label of initialKeys) assert.equal((await handler('keys/add', { label, key: TEST_KEYS[label] })).ok, true)
  const rpc = { async call(channel, endpoint, payload) {
    assert.equal(channel, '/apophiscode-api')
    calls.push({ endpoint, payload: structuredClone(payload) })
    await beforeCall?.(endpoint, payload)
    // Other cards do not exercise local CLI detection, diagnostics or online version reads.
    const reply = /^(?:status|balance|groups|keys\/|models\/|hosts\/)/u.test(endpoint)
      ? await handler(endpoint, payload)
      : { ok: false, error: { code: 'apophiscode/request-failed', message: 'ApophisCode fixture: unrelated card', details: {} } }
    for (const key of Object.values(TEST_KEYS)) assert.equal(JSON.stringify(reply).includes(key), false)
    await beforeReply?.(endpoint, reply)
    return structuredClone(reply)
  } }
  let client
  const window = {
    __ModuleLoader__: { load(spec) { client = spec.factory(name => name === 'react' ? react : jsx) } },
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window, Event: class { constructor(type) { this.type = type } },
    document: { head: { append() {} }, createElement: () => ({ dataset: {}, remove() {} }) },
  })
  client.apply({
    locale: { register() {}, bind: () => key => zh[key] }, effect: fn => fn(),
    get: name => name === 'connection' ? { rpc } : undefined, inject() {},
    slots: { inject: (_name, fn) => fn(), register(spec, component) { slots.set(spec.id ?? spec.key, { spec, component }) } },
  })
  const section = slots.get('apophiscode-api')
  let root
  await act(async () => { root = create(react.createElement(section.component, section.spec.inject())) })
  await settle()
  t.after(async () => {
    await act(async () => root.unmount())
    for (const dispose of disposers.reverse()) await dispose()
    await runtimeContext.fiber.dispose()
  })
  const card = title => root.root.find(node => node.type === 'section'
    && node.findAll(child => child.type === 'h3' && text(child) === title).length === 1)
  const rows = () => card(zh.accountsTitle).findAll(node => node.type === 'div' && node.props.className === 'apc-row')
  const button = (scope, label) => scope.find(node => node.type === 'button' && text(node) === label)
  return {
    calls, llm, handler, directories, directoriesByHost, card, rows, button,
    modelIds: () => card(zh.modelsTitle).findAll(node => node.type === 'b').map(text),
    row: label => rows().find(row => row.findAll(node => node.type === 'span' && node.props.className === 'apc-name' && text(node) === label).length > 0),
    async action(label, action) {
      await act(async () => button(this.row(label), action).props.onClick())
      await settle()
    },
    async select(label) {
      await this.action(label, zh.keyUse)
    },
  }
}

test('selecting the GPT key replaces the open DeepSeek model list and the DSH directory', async t => {
  const fx = await settingsFixture(t)
  assert.deepEqual(fx.modelIds(), DEEPSEEK)
  assert.deepEqual((await fx.llm.listModels('apophiscode')).map(model => model.id), DEEPSEEK)
  await fx.select('gpt')
  assert.equal((await fx.handler('status')).value.keys.find(key => key.active).label, 'gpt')
  assert.deepEqual((await fx.handler('models/status')).value.models.map(model => model.id), GPT)
  assert.deepEqual((await fx.llm.listModels('apophiscode')).map(model => model.id), GPT)
  assert.deepEqual(fx.modelIds(), GPT, 'the mounted settings card must replace DeepSeek with the active GPT key IDs')
  await fx.select('deepseek')
  assert.deepEqual(fx.modelIds(), DEEPSEEK)
})

test('repeated key switches preserve valid React identities and exactly one current model card', async t => {
  const errors = []
  t.mock.method(console, 'error', (...args) => errors.push(args.join(' ')))
  const fx = await settingsFixture(t)
  for (const [label, ids] of [['gpt', GPT], ['deepseek', DEEPSEEK], ['gpt', GPT]]) {
    await fx.select(label)
    assert.deepEqual(fx.modelIds(), ids)
  }
  assert.deepEqual(errors, [], 'React must be able to remove the old card without duplicate sibling identities')
})

test('an initial balance RPC failure cannot hide stored keys or prevent switching models', async t => {
  const fx = await settingsFixture(t, { beforeReply(endpoint) {
    if (endpoint === 'balance') throw new Error('offline balance failure')
  } })
  assert.ok(fx.row('gpt'), 'credential status must render independently of balance reads')
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), GPT)
  assert.match(text(fx.card(zh.accountsTitle)), /余额暂时无法更新/u)
})

test('a pending balance read cannot delay the new model list after a key switch', async t => {
  let release, hold = false
  const pending = new Promise(resolve => { release = resolve })
  const fx = await settingsFixture(t, { beforeCall(endpoint) {
    if (endpoint === 'balance' && hold) return pending
  } })
  hold = true
  let selection
  try {
    await act(async () => { selection = fx.button(fx.row('gpt'), zh.keyUse).props.onClick() })
    await settle()
    assert.deepEqual(fx.modelIds(), GPT, 'do not wait for ancillary balances to load the selected key models')
    assert.equal(fx.button(fx.row('deepseek'), zh.keyUse).props.disabled, false, 'a pending balance must not lock the next key switch')
  } finally {
    await act(async () => { release(); await selection })
  }
})

test('initial pending balances leave key switching usable and late balance replies cannot undo it', async t => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const fx = await settingsFixture(t, { beforeReply(endpoint) {
    if (endpoint === 'balance') return pending
  } })
  let selection
  let selectionDone = false
  try {
    assert.equal(fx.button(fx.row('gpt'), zh.keyUse).props.disabled, false)
    assert.equal(fx.button(fx.card(zh.accountsTitle), zh.refreshing).props.disabled, true)
    await act(async () => {
      selection = fx.button(fx.row('gpt'), zh.keyUse).props.onClick().then(() => { selectionDone = true })
    })
    await settle()
    assert.equal(selectionDone, true, 'a saved credential action completes independently of its balance read')
    assert.deepEqual(fx.modelIds(), GPT)
    assert.equal(fx.button(fx.row('deepseek'), zh.keyUse).props.disabled, false)
  } finally {
    await act(async () => { release(); await selection })
  }
  await settle()
  assert.deepEqual(fx.modelIds(), GPT)
  assert.equal(fx.button(fx.card(zh.accountsTitle), zh.refresh).props.disabled, false)
})

test('invalid balance JSON retains a clearly dated balance while switching models automatically', async t => {
  let malformed = false
  const fx = await settingsFixture(t, { usageReply() {
    return malformed ? new Response('<html>unavailable</html>') : undefined
  } })
  malformed = true
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), GPT)
  const content = text(fx.row('gpt'))
  assert.match(content, /余额暂时无法更新/u)
  assert.match(content, /上次成功读取于/u)
  assert.match(content, /余额接口返回的数据无法解析/u)
  assert.doesNotMatch(content, /unreadable balance data/u)
})

test('disabling, re-enabling and removing active keys refreshes the model card through the empty ring', async t => {
  const fx = await settingsFixture(t)
  await fx.action('deepseek', zh.keyDisable)
  assert.deepEqual(fx.modelIds(), GPT)
  await fx.action('gpt', zh.keyDisable)
  assert.deepEqual(fx.modelIds(), [])
  await fx.action('deepseek', zh.keyEnable)
  assert.deepEqual(fx.modelIds(), DEEPSEEK)
  await fx.action('deepseek', zh.keyRemove)
  assert.deepEqual(fx.modelIds(), [])
  await fx.action('gpt', zh.keyEnable)
  assert.deepEqual(fx.modelIds(), GPT)
  await act(async () => fx.button(fx.card(zh.accountsTitle), zh.removeAll).props.onClick())
  await settle()
  assert.deepEqual(fx.modelIds(), [])
})

test('adding the first key replaces an empty model list', async t => {
  const fx = await settingsFixture(t, { initialKeys: [] })
  assert.deepEqual(fx.modelIds(), [])
  const fields = fx.card(zh.accountsTitle).findAll(node => node.type === 'input')
  await act(async () => fields[0].props.onChange({ target: { value: TEST_KEYS.gpt } }))
  await act(async () => fields[1].props.onChange({ target: { value: 'gpt' } }))
  await act(async () => fx.card(zh.accountsTitle).findByType('form').props.onSubmit({ preventDefault() {} }))
  await settle()
  assert.deepEqual(fx.modelIds(), GPT)
})

test('a failed key selection keeps the current models and reports the failed save', async t => {
  const fx = await settingsFixture(t, { beforeCall(endpoint) {
    if (endpoint === 'keys/select') throw new Error('offline selection refused')
  } })
  const reads = fx.calls.filter(call => call.endpoint === 'models/status').length
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), DEEPSEEK)
  assert.equal((await fx.handler('status')).value.keys.find(key => key.active).label, 'deepseek')
  assert.equal(fx.calls.filter(call => call.endpoint === 'models/status').length, reads)
  assert.match(text(fx.card(zh.accountsTitle)), /offline selection refused/u)
})

test('manual account refresh replaces changed raw IDs and a failed discovery cannot retain the old list', async t => {
  const fx = await settingsFixture(t)
  const refresh = async () => {
    await act(async () => fx.button(fx.card(zh.accountsTitle), zh.refresh).props.onClick())
    await settle()
  }
  fx.directories.set(TEST_KEYS.deepseek, ['deepseek-future-unknown', 'deepseek-v4-flash-0731'])
  await refresh()
  assert.deepEqual(fx.modelIds(), ['deepseek-future-unknown', 'deepseek-v4-flash-0731'])
  fx.directories.set(TEST_KEYS.deepseek, null)
  await refresh()
  assert.deepEqual(fx.modelIds(), [])
  assert.match(text(fx.card(zh.modelsTitle)), /active key model list is unavailable/u)
  fx.directories.set(TEST_KEYS.deepseek, DEEPSEEK)
  await refresh()
  assert.deepEqual(fx.modelIds(), DEEPSEEK)
})

test('an initial DeepSeek reply arriving after selection cannot overwrite the current GPT model card', async t => {
  let release
  const delayed = new Promise(resolve => { release = resolve })
  let first = true
  const fx = await settingsFixture(t, { beforeReply(endpoint) {
    if (endpoint === 'models/status' && first) { first = false; return delayed }
  } })
  assert.deepEqual(fx.modelIds(), [])
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), GPT)
  await act(async () => release())
  await settle()
  assert.deepEqual(fx.modelIds(), GPT)
})

test('switching keys reloads models even if the following balance RPC fails', async t => {
  let failBalance = false
  const fx = await settingsFixture(t, { beforeReply(endpoint) {
    if (endpoint === 'balance' && failBalance) throw new Error('offline balance failure')
  } })
  failBalance = true
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), GPT)
  assert.match(text(fx.card(zh.accountsTitle)), /offline balance failure/u)
})

test('selecting a key with failed discovery clears the previous list and account refresh can recover it', async t => {
  const fx = await settingsFixture(t, { directoryEntries: [[TEST_KEYS.deepseek, DEEPSEEK], [TEST_KEYS.gpt, null]] })
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), [])
  assert.match(text(fx.card(zh.modelsTitle)), /active key model list is unavailable/u)
  fx.directories.set(TEST_KEYS.gpt, GPT)
  await act(async () => fx.button(fx.card(zh.accountsTitle), zh.refresh).props.onClick())
  await settle()
  assert.deepEqual(fx.modelIds(), GPT)
})

test('changing the API target reloads the model card from that target', async t => {
  const fx = await settingsFixture(t)
  fx.directoriesByHost.set('https://apophiscode-target.example', new Map([[TEST_KEYS.deepseek, GPT], [TEST_KEYS.gpt, []]]))
  const apiHost = fx.card(zh.accountsTitle).findByType('details').findAllByType('input')[0]
  await act(async () => apiHost.props.onBlur({ target: { value: 'https://apophiscode-target.example' } }))
  await settle()
  assert.deepEqual(fx.modelIds(), GPT)
  assert.deepEqual((await fx.llm.listModels('apophiscode')).map(model => model.id), GPT)
})

test('a previous-key visibility save reply cannot replace the new list, and hidden IDs survive switching back', async t => {
  let release
  const delayed = new Promise(resolve => { release = resolve })
  const fx = await settingsFixture(t, { beforeReply(endpoint) {
    if (endpoint === 'models/update') return delayed
  } })
  const checkbox = fx.card(zh.modelsTitle).findAllByType('input')[0]
  await act(async () => checkbox.props.onChange({ target: { checked: false } }))
  await fx.select('gpt')
  assert.deepEqual(fx.modelIds(), GPT)
  await act(async () => release())
  await settle()
  assert.deepEqual(fx.modelIds(), GPT)
  await fx.select('deepseek')
  assert.deepEqual(fx.modelIds(), DEEPSEEK)
  assert.equal(fx.card(zh.modelsTitle).findAllByType('input')[0].props.checked, false)
  assert.deepEqual((await fx.llm.listModels('apophiscode')).map(model => model.id), DEEPSEEK.slice(1))
})
