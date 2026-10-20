#!/usr/bin/env node
/** Paid opt-in checks for one exact active-key model through the built HTTP route.
 * Requires --model; optional --with-search and --with-vision add requests.
 * Reads only plugin-owned stored credentials and never changes DSH state.
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { exactModel } from './gateway-directory.mjs'
import { readStoredKey } from './stored-key.mjs'
import { createVisionFixture } from './vision-fixture.mjs'
import { createBusinessScenario, matchesBusinessAnswer } from './claude-scenarios.mjs'

import {
  ApophisCodeKeyRing,
  createBalanceReader,
  createGroupReader,
  createKeyChooser,
  createApophisCodeRpc,
  createApophisCodeSearchProvider,
  createRouteAdapter,
} from '../lib/index.js'

const PROVIDER = 'apophiscode'
const SESSION_ID = 'live-check-session'
const HOSTS = Object.freeze({ apiHost: 'https://www.apophis.uk', statusHost: 'https://www.apophis.uk' })


/** In-memory stand-in for the DSH credential-record service. */
function fakeCredentials() {
  const records = new Map()
  let chain = Promise.resolve()
  return {
    async readRecord(id) {
      return records.get(id)
    },
    modifyRecord(id, mutate) {
      const run = chain.then(async () => {
        const next = await mutate(records.get(id))
        if (next !== undefined) records.set(id, next)
        return records.get(id)
      })
      chain = run.then(() => undefined, () => undefined)
      return run
    },
  }
}

const logger = {
  warn: (format, ...args) => console.log(`   ! ${format}`, ...args),
  info: (format, ...args) => console.log(`   · ${format}`, ...args),
}

/** The plugin's composition, around one ring. */
async function routeWith(entries, { groupReader, resolveAttachments } = {}) {
  const ring = new ApophisCodeKeyRing(fakeCredentials())
  for (const [key, label] of entries) await ring.add(key, label)
  const groups = groupReader ?? createGroupReader({ listKeys: () => ring.secrets(), getHosts: () => HOSTS, getActiveKey: () => ring.activeKey() })
  const keys = createKeyChooser({ ring, groups, logger })
  const adapter = createRouteAdapter({ ring, keys, getApiHost: () => HOSTS.apiHost, availableModels: groups.availableModels, fallbackSessionId: SESSION_ID, resolveAttachments })
  return { ring, groups, keys, adapter }
}

/** One turn through an adapter; the finish reason and the streamed text. */
async function turn(adapter, model, text = 'Reply with exactly: ok', { image } = {}) {
  const prepared = await adapter.prepareCall(PROVIDER, model)
  let answer = ''
  let finish
  for await (const chunk of prepared.stream({
    provider: PROVIDER,
    model,
    sessionId: SESSION_ID,
    maxTokens: 2048,
    signal: AbortSignal.timeout(90_000),
    messages: [createUserMessage({ content: [{ type: 'text', text }, ...(image === undefined ? [] : [image])], source: { kind: 'user' } })],
  })) {
    if (chunk.type === 'text-delta') answer += chunk.text
    if (chunk.type === 'finish') finish = chunk.reason
  }
  return { answer: answer.trim(), finish }
}

const describe = ({ answer, finish }) => (finish?.kind === 'stop'
  ? `→ ${answer.slice(0, 60)}`
  : `→ FAILED: ${String(finish?.failure?.message ?? 'no finish').slice(0, 140)}`)

async function main() {
  const modelIndex = process.argv.indexOf('--model')
  const selectedModel = exactModel(modelIndex < 0 ? undefined : process.argv[modelIndex + 1])
  const labelIndex = process.argv.indexOf('--key-label')
  const label = labelIndex < 0 ? undefined : process.argv[labelIndex + 1]
  if (labelIndex >= 0 && (label === undefined || label.startsWith('--'))) throw new Error('--key-label needs a key label')
  const key = await readStoredKey({ label })
  const mask = text => String(text).split(key).join('[redacted]')
  console.log('Using the selected plugin-owned stored key')
  let visionFixture
  const route = await routeWith([[key, 'live-check']], { resolveAttachments: () => visionFixture?.attachments })
  const checkVision = async model => {
    for (const color of ['red', 'blue']) {
      visionFixture = createVisionFixture(color)
      const result = await turn(route.adapter, model,
        'What is the dominant color in this image? Reply with exactly one lowercase English color word.',
        { image: visionFixture.block })
      console.log(`   ${model} ${color} image ${mask(describe(result))}`)
      if (result.finish?.kind !== 'stop' || result.answer.toLowerCase() !== color || visionFixture.reads.length !== 1) {
        throw new Error(`${model} vision check failed for the ${color} image`)
      }
    }
  }

  console.log('1) balance')
  const balance = createBalanceReader({ listKeys: () => route.ring.secrets(), getHosts: () => HOSTS })
  const value = await balance.read()
  const row = value.keys[0]
  const remaining = row.usage?.unlimitedQuota === true ? 'unlimited' : `$${row.usage?.availableUsd}`
  console.log(`   key "${row.label}": available ${remaining}, used $${row.usage?.usedUsd} (${row.usage?.resetPeriod ?? 'no period'})${row.error === undefined ? '' : ` ERROR ${row.error}`}`)
  console.log(`   projection carries account billing: ${Object.hasOwn(value, 'account') ? 'YES (bug)' : 'no'}\n`)

  console.log('2) groups')
  const groups = await route.groups.read()
  const entry = groups.keys[0]
  console.log(`   groups: ${entry.groups?.join(', ') ?? `unread (${entry.error})`}`)
  console.log(`   reaches: ${Object.entries(entry.coverage).map(([id, ok]) => `${ok ? '✓' : '✗'} ${id}`).join('  ')}`)
  console.log(`   projection carries key material: ${JSON.stringify(groups).includes(key) ? 'YES (bug)' : 'no'}\n`)

  console.log('3) one answer per HTTP model, through the registered route')
  for (const id of [selectedModel]) {
    const scenario = createBusinessScenario('text')
    const result = await turn(route.adapter, id, scenario?.prompt)
    console.log(`   ${id.padEnd(16)} ${mask(describe(result))}`)
    const valid = scenario === undefined || matchesBusinessAnswer(scenario, result.answer)
    if (!valid) console.log(`   business validation failed: ${mask(JSON.stringify({ scenario: scenario.id, answer: result.answer, finish: result.finish })).slice(0, 800)}`)
    if (result.finish?.kind !== 'stop' || !valid) process.exitCode = 1
  }
  if (process.argv.includes('--with-vision')) await checkVision(selectedModel)
  if (process.argv.includes('--with-search')) {
    const provider = createApophisCodeSearchProvider({ ring: route.ring, hosts: () => HOSTS,
      selectedModel: () => selectedModel, availableModels: route.groups.availableModels, onKeyFailure: route.keys.onKeyFailure })
    const found = await provider.search({ query: 'latest Node.js release', maxResults: 8 })
    console.log(`Search returned ${found.sources.length} sources`)
  }

  console.log('\n7) what the settings panel receives over RPC')
  const rpcRing = new ApophisCodeKeyRing(fakeCredentials())
  const handler = createApophisCodeRpc({
    ring: rpcRing,
    balance: createBalanceReader({ listKeys: () => rpcRing.secrets(), getHosts: () => HOSTS }),
    groups: createGroupReader({ listKeys: () => rpcRing.secrets(), getHosts: () => HOSTS }),
    hosts: () => HOSTS,
    preference: { writable: false, set: async () => {} },
  })
  const added = await handler('keys/add', { key, label: 'rpc check' })
  console.log(`   keys/add ok=${added.ok}; status=${JSON.stringify(added.value.keys)}`)
  const projection = await handler('balance')
  const active = projection.value.keys.find(item => item.id === projection.value.activeId)
  console.log(`   activeId=${projection.value.activeId} label=${active?.label} available=$${active?.usage?.availableUsd} reset=${active?.usage?.resetPeriod}`)
  const groupProjection = await handler('groups')
  console.log(`   groups ok=${groupProjection.ok}: ${groupProjection.value?.keys?.[0]?.groups?.join(', ')}`)
  console.log(`   projections carry key material: ${JSON.stringify([projection, groupProjection]).includes(key) ? 'YES (bug)' : 'no'}`)


}

await main()
