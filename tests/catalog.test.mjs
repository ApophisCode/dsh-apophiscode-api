import assert from 'node:assert/strict'
import test from 'node:test'
import { createApophisCodeCatalog, declaredMetadata } from '../src/catalog.js'

// Arbitrary names deliberately carry no implied supplier or capabilities.
test('catalog has no default models and preserves injected exact identities and order', () => {
  assert.deepEqual(createApophisCodeCatalog(), [])
  const models = [{id:'future/β-2040-01',api:'openai-responses'}, {id:'opaque:second',api:'anthropic-messages'}]
  const actual = createApophisCodeCatalog('https://relay.example/root/v1', { models })
  assert.deepEqual(actual.map(m=>[m.id,m.name]), models.map(m=>[m.id,m.id]))
  assert.equal(actual[0].baseUrl,'https://relay.example/root/v1')
  assert.equal(actual[1].baseUrl,'https://relay.example/root')
  assert.ok(Object.isFrozen(actual) && actual.every(Object.isFrozen))
  for (const m of actual) {
    assert.equal(m.contextWindow,undefined)
    assert.equal(m.maxTokens,undefined)
    assert.equal(m.reasoning,undefined)
    assert.equal(m.input,undefined)
  }
})
test('only structured declarations supply capabilities', () => {
  assert.deepEqual(declaredMetadata({ id:'gpt-claude-gemini-deepseek', owned_by:'supplier', context_length:-1 }),{})
  assert.deepEqual(declaredMetadata({api:'unsupported',input_modalities:['audio'],reasoning_efforts:['made-up']}),{})
  assert.deepEqual(declaredMetadata({api:'openai-responses',context_window:12345,max_output_tokens:456,input_modalities:['text','image'],reasoning_efforts:['high','low']}),{
    api:'openai-responses',contextWindow:12345,maxTokens:456,input:['text','image'],reasoningEfforts:{high:'high',low:'low'},
  })
})
