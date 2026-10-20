/** Maintenance checks use the same active-key directory as the plugin. */
import { createGroupReader } from '../src/groups.js'
import { DEFAULT_API_HOST } from '../src/constants.js'

export function gatewayDirectory(ring, apiHost = DEFAULT_API_HOST) {
  return createGroupReader({ listKeys: () => ring.secrets(), getActiveKey: () => ring.activeKey(),
    getHosts: () => ({ apiHost, statusHost: apiHost }) })
}

export function exactModel(value) {
  if (typeof value !== 'string' || value.trim() === '' || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error('An exact --model ID from the active key directory is required')
  }
  return value
}
