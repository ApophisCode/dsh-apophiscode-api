#!/usr/bin/env node
// Confirm npm holds the same bytes before creating a GitHub Release.
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PACKAGE_NAME, REGISTRY } from './release-preflight.mjs'

export async function verifyRegistryRelease(version, bytes, { fetchImpl = fetch } = {}) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version ?? '')) throw new Error('Registry verification requires a stable x.y.z version')
  const response = await fetchImpl(`${REGISTRY}${PACKAGE_NAME}/${version}`, {
    redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`npm exact version verification failed (HTTP ${response.status})`)
  const metadata = await response.json()
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  if (metadata.name !== PACKAGE_NAME || metadata.version !== version || metadata.dist?.integrity !== integrity) {
    throw new Error('npm package identity or integrity differs from the reviewed tarball')
  }
  return integrity
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const [version, tarball] = process.argv.slice(2)
    if (process.argv.length !== 4) throw new Error('Usage: verify-registry-release.mjs <version> <tarball>')
    await verifyRegistryRelease(version, await readFile(tarball))
    console.log(`Verified ${PACKAGE_NAME}@${version}: npm integrity matches the reviewed tarball`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
