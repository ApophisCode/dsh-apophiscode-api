/**
 * The quota total one key shows.
 *
 * Only an explicit quota limit from `/v1/usage` is a total. Wallet balances,
 * all-time usage costs and subscription period limits are distinct amounts.
 *
 * @module dsh-apophiscode-api/totals
 */

const amount = value => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

/** Never infer a total by adding amounts from different billing scopes. */
export function quotaTotalUsd(usage) {
  if (usage?.unlimitedQuota === true) return undefined
  return amount(usage?.limitUsd)
}
