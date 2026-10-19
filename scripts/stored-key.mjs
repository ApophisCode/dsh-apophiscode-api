/** Read only the plugin-owned key record; never use a reference or ambient key. */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseDocument } from 'yaml'

import { ApophisCodeKeyRing } from '../lib/index.js'

export async function readStoredKey({
  filePath = join(process.env.DSH_HOME || join(homedir(), '.dsh'), '.credentials.yaml'),
  label,
  recordId = 'keys',
} = {}) {
  if (!['keys', 'image-keys'].includes(recordId)) throw new Error('ApophisCode live check credential scope is not supported')
  const recordKey = `apophiscode-api/${recordId}`
  let record
  try {
    const doc = parseDocument(readFileSync(filePath, 'utf8'), { prettyErrors: false, logLevel: 'silent' })
    if (doc.errors.length) throw new Error('invalid credential document')
    record = doc.toJS()?.records?.[recordKey]
  } catch {
    // YAML diagnostics can quote source lines containing secrets.
    throw new Error('ApophisCode plugin credentials could not be read safely')
  }
  const ring = new ApophisCodeKeyRing({
    readRecord: async id => id === recordKey ? record : undefined,
    modifyRecord: async () => { throw new Error('ApophisCode live checks cannot change stored credentials') },
  }, { recordId })
  if (label !== undefined) {
    const matches = (await ring.secrets()).filter(entry => entry.label === label && !entry.disabled)
    if (matches.length !== 1) throw new Error('ApophisCode live check needs one usable key with that label')
    return matches[0].key
  }
  const active = await ring.activeKey()
  if (active === undefined) throw new Error(recordId === 'image-keys'
    ? 'ApophisCode image check needs a separate image key added under Settings → ApophisCode → Images'
    : 'ApophisCode live check needs a usable key added under Settings → ApophisCode')
  return active.key
}
