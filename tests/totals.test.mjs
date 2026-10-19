import assert from 'node:assert/strict'
import test from 'node:test'

import { quotaTotalUsd } from '../src/totals.js'
import { parseTokenUsage } from '../src/balance.js'

test('only an explicit quota limit becomes a displayed total', () => {
  assert.equal(quotaTotalUsd({ availableUsd: 499, usedUsd: 1, limitUsd: 600 }), 600)
  assert.equal(quotaTotalUsd({ limitUsd: 0 }), 0)
  assert.equal(quotaTotalUsd({ availableUsd: 10, usedUsd: 5 }), undefined)
})

test('wallet, costs and subscription periods are never added into a total', () => {
  const usage = parseTokenUsage({ balance: 40, subscription: { daily_limit_usd: 10, daily_usage_usd: 2 }, usage: { total: { actual_cost: 20 } } })
  assert.equal(usage.availableUsd, 40)
  assert.equal(usage.usedUsd, undefined)
  assert.equal(quotaTotalUsd(usage), undefined)
})

test('missing or non-finite limits remain unknown', () => {
  assert.equal(quotaTotalUsd({ limitUsd: NaN }), undefined)
  assert.equal(quotaTotalUsd({ unlimitedQuota: true, limitUsd: 50 }), undefined)
  assert.equal(quotaTotalUsd(undefined), undefined)
})
