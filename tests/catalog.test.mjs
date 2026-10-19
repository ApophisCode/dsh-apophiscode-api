import assert from 'node:assert/strict'
import test from 'node:test'

import { getSupportedThinkingLevels } from '@earendil-works/pi-ai'

import { createApophisCodeCatalog, APOPHISCODE_MODELS, APOPHISCODE_MODEL_IDS } from '../src/catalog.js'
import { DEFAULT_API_HOST, DEFAULT_REASONING_LEVEL, PROVIDER } from '../src/constants.js'

const byId = id => createApophisCodeCatalog(undefined, { includeLegacy: true }).find(model => model.id === id)

test('ships the configured model ids in picker order', () => {
  assert.deepEqual([...APOPHISCODE_MODEL_IDS], ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4.1-flash', 'gpt-6.1-sol', 'gpt-6-astra', 'gpt-5.6-sol', 'claude-opus-5-5', 'claude-sonnet-5-5'])
  for (const model of APOPHISCODE_MODELS) assert.equal(model.provider, PROVIDER)
})

test('binding a catalog changes only protocol base URLs and preserves the frozen baseline', () => {
  const before = JSON.stringify(APOPHISCODE_MODELS)
  const catalog = createApophisCodeCatalog('https://relay.example/gateway/v1/')
  assert.equal(Object.isFrozen(catalog), true)
  for (const [index, model] of catalog.entries()) {
    assert.equal(Object.isFrozen(model), true)
    const { baseUrl, ...metadata } = model
    const { baseUrl: _baselineUrl, ...baseline } = APOPHISCODE_MODELS[index]
    assert.deepEqual(metadata, baseline)
    assert.ok(baseUrl.startsWith('https://relay.example/gateway'))
  }
  assert.equal(JSON.stringify(APOPHISCODE_MODELS), before)
})

test('every current model declares the text and image inputs documented by its vendor', () => {
  for (const model of APOPHISCODE_MODELS) {
    assert.deepEqual([...model.input], ['deepseek-v4-flash', 'deepseek-v4-pro'].includes(model.id) ? ['text'] : ['text', 'image'], model.id)
  }
})

test('pins each model to its selected protocol and SDK base URL', () => {
  // OpenAI traffic carries /v1 and never an endpoint path; the SDK appends it.
  assert.equal(byId('deepseek-v4.1-flash').api, 'openai-responses')
  assert.equal(byId('deepseek-v4.1-flash').baseUrl, `${DEFAULT_API_HOST}/v1`)
  assert.equal(byId('gpt-6.1-sol').api, 'openai-responses')
  assert.equal(byId('gpt-6.1-sol').baseUrl, `${DEFAULT_API_HOST}/v1`)
  // GPT-6 Astra rides the same Responses route as Sol (the Codex group's protocol).
  assert.equal(byId('gpt-6-astra').api, 'openai-responses')
  assert.equal(byId('gpt-6-astra').baseUrl, `${DEFAULT_API_HOST}/v1`)
  assert.deepEqual([...byId('gpt-6-astra').input], ['text', 'image'])
  assert.equal(byId('gpt-6-astra').contextWindow, 1_050_000)
  // developers.openai.com: GPT-5.6 Sol serves Responses with text and image input, 1,050,000 context and 128,000 output.
  assert.equal(byId('gpt-5.6-sol').api, 'openai-responses')
  assert.equal(byId('gpt-5.6-sol').baseUrl, `${DEFAULT_API_HOST}/v1`)
  assert.equal(byId('gpt-5.6-sol').contextWindow, 1_050_000)
  assert.equal(byId('gpt-5.6-sol').maxTokens, 128_000)
  // platform.claude.com: every Claude 5.5 model, Haiku included, has a 1M context and 128K output.
  for (const id of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']) {
    assert.equal(byId(id).contextWindow, 1_000_000, id)
    assert.equal(byId(id).maxTokens, 128_000, id)
  }
  assert.equal(byId('gpt-6-astra').maxTokens, 128_000)
  assert.equal(byId('grok-4.7').name, 'grok-4.7')
  assert.equal(byId('grok-4.7').api, 'openai-responses')
  assert.equal(byId('grok-4.7').baseUrl, `${DEFAULT_API_HOST}/v1`)
  assert.deepEqual([...byId('grok-4.7').input], ['text', 'image'])
  assert.equal(byId('grok-4.7').contextWindow, 500_000)
  assert.equal(byId('grok-4.7').maxTokens, 500_000)
  assert.equal(byId('grok-4.7').compat.supportsLongCacheRetention, false)
  assert.equal(byId('gemini-4-argon').name, 'gemini-4-argon')
  assert.equal(byId('gemini-4-argon').api, 'google-generative-ai')
  assert.equal(byId('gemini-4-argon').baseUrl, `${DEFAULT_API_HOST}/v1beta`)
  assert.equal(byId('gemini-4-argon').contextWindow, 1_048_576)
  assert.equal(byId('gemini-4-argon').maxTokens, 65_536)
  assert.equal(byId('gemini-3.8-flash').name, 'gemini-3.8-flash')
  assert.equal(byId('gemini-3.8-flash').api, 'google-generative-ai')
  assert.equal(byId('gemini-3.8-flash').baseUrl, `${DEFAULT_API_HOST}/v1beta`)
  assert.equal(byId('gemini-3.8-flash').contextWindow, 1_048_576)
  assert.equal(byId('gemini-3.8-flash').maxTokens, 65_536)
  // Anthropic traffic carries no /v1: the Anthropic client appends /v1/messages.
  for (const id of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']) {
    assert.equal(byId(id).api, 'anthropic-messages')
    assert.equal(byId(id).baseUrl, DEFAULT_API_HOST)
  }
})

test("offers each vendor's documented effort levels", () => {
  assert.deepEqual(getSupportedThinkingLevels(byId('deepseek-v4-pro')), ['high', 'max'])
  assert.deepEqual(getSupportedThinkingLevels(byId('deepseek-v4-flash')), ['off', 'low', 'high', 'max'])
  assert.deepEqual(getSupportedThinkingLevels(byId('deepseek-v4.1-flash')), ['off', 'low', 'high', 'max'])
  assert.deepEqual(getSupportedThinkingLevels(byId('gpt-6.1-sol')), ['low', 'medium', 'high', 'xhigh', 'max'])
  // developers.openai.com: GPT-6 Astra `reasoning.effort` is low | medium | high | xhigh | max.
  assert.deepEqual(getSupportedThinkingLevels(byId('gpt-6-astra')), ['low', 'medium', 'high', 'xhigh', 'max'])
  // GPT-5.6 Sol documents `none` too, but it is not offered: through ApophisCode it answered at medium.
  assert.deepEqual(getSupportedThinkingLevels(byId('gpt-5.6-sol')), ['low', 'medium', 'high', 'xhigh', 'max'])
  assert.deepEqual(getSupportedThinkingLevels(byId('grok-4.7')), ['low', 'medium', 'high', 'xhigh'])
  assert.deepEqual(getSupportedThinkingLevels(byId('gemini-4-argon')), ['low', 'medium', 'high'])
  assert.deepEqual(getSupportedThinkingLevels(byId('gemini-3.8-flash')), ['low', 'medium', 'high'])
  for (const id of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']) {
    assert.deepEqual(getSupportedThinkingLevels(byId(id)), ['low', 'medium', 'high', 'xhigh', 'max'])
  }
})

test('every model accepts the route default effort', () => {
  for (const model of APOPHISCODE_MODELS) {
    assert.ok(
      getSupportedThinkingLevels(model).includes(DEFAULT_REASONING_LEVEL),
      `${model.id} must support ${DEFAULT_REASONING_LEVEL}`,
    )
  }
})

test('declares the wire dialect each protocol needs', () => {
  assert.equal(byId('deepseek-v4.1-flash').compat, undefined)
  // Claude 5.x always thinks adaptively and rejects temperature.
  for (const id of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']) {
    assert.equal(byId(id).compat.forceAdaptiveThinking, true)
    assert.equal(byId(id).compat.supportsTemperature, false)
  }
  assert.equal(byId('gpt-6.1-sol').compat, undefined)
  assert.equal(byId('gpt-6-astra').compat, undefined)
  assert.equal(byId('gpt-5.6-sol').compat, undefined)
})
