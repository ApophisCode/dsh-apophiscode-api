#!/usr/bin/env node
// Validate release identity and prepare the exact tarball's review artifacts.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readReleaseNotes } from './release-notes.mjs'

export const PACKAGE_NAME = 'dsh-apophiscode-api'
export const REGISTRY = 'https://registry.npmjs.org/'
export const REPOSITORY = 'https://github.com/ApophisCode/dsh-apophiscode-api.git'
const root = fileURLToPath(new URL('../', import.meta.url))

export function validateRelease(manifest, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version ?? '')) throw new Error('Release version must be a stable x.y.z version')
  if (manifest.name !== PACKAGE_NAME || manifest.version !== version) throw new Error('Release version and package identity must match package.json')
  if (manifest.private !== false || manifest.publishConfig?.access !== 'public'
    || manifest.publishConfig?.registry !== REGISTRY || manifest.repository?.url !== REPOSITORY) {
    throw new Error('Release requires the public ApophisCode package, official registry and repository')
  }
  return `${PACKAGE_NAME}-${version}.tgz`
}

export async function prepareRelease(version, directory = root) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
  const filename = validateRelease(manifest, version)
  const notes = readReleaseNotes(version, pathToFileURL(`${directory}/`))
  const changelog = await readFile(resolve(directory, 'CHANGELOG.md'), 'utf8')
  if (!changelog.includes(`## ${version} `)) throw new Error('Release version needs its own CHANGELOG entry')
  const tarball = resolve(directory, '.artifacts', filename)
  const bytes = await readFile(tarball)
  const output = resolve(directory, '.artifacts', 'release', version)
  await mkdir(output, { recursive: true })
  await copyFile(tarball, resolve(output, filename))
  await writeFile(resolve(output, 'SHA256SUMS'), `${createHash('sha256').update(bytes).digest('hex')}  ${filename}\n`)
  await writeFile(resolve(output, 'notes.md'), notes.body)
  await writeFile(resolve(output, 'title.txt'), `${notes.title}\n`)
  return output
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: release-preflight.mjs <version>')
    console.log(await prepareRelease(process.argv[2]))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
