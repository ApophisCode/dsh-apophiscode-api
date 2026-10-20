/**
 * Version self-knowledge for the settings panel.
 *
 * The running version comes from this package. The latest version comes from
 * the npm registry. An in-place update is only offered for a registry install,
 * and it installs that exact version with the host's own pnpm — never through
 * `dsh plugin --profile desktop`, which the desktop app refuses. The install
 * runs under the profile's own `minimumReleaseAge`: a version installed past
 * it would sit in the profile's lockfile, and pnpm then refuses every later
 * plugin install in that profile until the version is old enough. A version
 * pnpm still holds back is reported as pending, with when it clears. Registry
 * bodies and package-manager output stay host-side.
 *
 * @module dsh-apophiscode-api/plugin-version
 */

import { spawn } from 'node:child_process'
import { readdir, readFile, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCachedRead } from './cached-read.js'
import { ambientFetch, boundedFetch } from './request.js'
import { resolvePnpmLauncher } from './plugin-pnpm.js'
import { withProgramDirOnPath } from './locate.js'
import { installerFailure, UPDATE_ERRORS } from './plugin-update-errors.js'

export { ambientFetch, waitForSharedRequest } from './request.js'
export { resolvePnpm } from './plugin-pnpm.js'

export const PACKAGE_NAME = 'dsh-apophiscode-api'
export const NPM_REGISTRY_LATEST_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`
export const DEFAULT_VERSION_TTL_MS = 5 * 60_000
export const DEFAULT_VERSION_TIMEOUT_MS = 10_000
export const DEFAULT_UPDATE_TIMEOUT_MS = 180_000
export const DEFAULT_SETTLE_DELAY_MS = 250

const RELEASE_AGE_ERROR = /ERR_PNPM_(?:NO_MATURE_MATCHING_VERSION|MINIMUM_RELEASE_AGE_VIOLATION)/u
const RELEASE_AGE_ENTRY = /(\S+@\S+) was published at (\S+?), within the minimumReleaseAge cutoff \((\S+?)\)/gu

/**
 * Recognize pnpm refusing a version that is younger than its
 * `minimumReleaseAge`, whether the version was requested or already sits in
 * the lockfile. Each refused entry reads `<name>@<version> was published at
 * <time>, within the minimumReleaseAge cutoff (<time>)`.
 * @param output - the install's stdout and stderr.
 * @param finishedAt - when the install ended; pnpm drew its cutoff then.
 * @returns undefined when this is not a release-age refusal; otherwise
 *   `{ availableAt }`, when the youngest refused entry clears, if pnpm said.
 */
export function releaseAgeRefusal(output, finishedAt) {
  // A colour-forcing environment can wrap the entries in ANSI escapes.
  const text = String(output ?? '').replace(/\u001b\[[0-9;]*m/gu, '')
  if (!RELEASE_AGE_ERROR.test(text)) return undefined
  let availableAt
  for (const [, , published, cutoff] of text.matchAll(RELEASE_AGE_ENTRY)) {
    const clears = Date.parse(published) + (finishedAt - Date.parse(cutoff))
    if (Number.isFinite(clears) && (availableAt === undefined || clears > availableAt)) availableAt = clears
  }
  return availableAt === undefined ? {} : { availableAt }
}

/** Parse a strict `x.y.z[-pre][+build]` version; anything else is undefined. */
export function parseSemver(value) {
  if (typeof value !== 'string') return undefined
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(value.trim())
  if (match === null) return undefined
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), pre: match[4] }
}

/** Compare two versions: -1/0/1, or undefined when either side is not semver. */
export function compareSemver(a, b) {
  const left = parseSemver(a)
  const right = parseSemver(b)
  if (left === undefined || right === undefined) return undefined
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1
  }
  if (left.pre === right.pre) return 0
  if (left.pre === undefined) return 1
  if (right.pre === undefined) return -1
  return left.pre < right.pre ? -1 : 1
}

/**
 * Classify how the running package reached the profile. Only registry specs
 * may be updated in place; local checkouts belong to the owner's iteration.
 */
function classifySpec(spec) {
  if (typeof spec !== 'string' || spec === '') return 'unknown'
  if (/^(?:link|file):/u.test(spec)) return 'link'
  if (/^(?:\d|[~^*])/u.test(spec)) return 'npm'
  return 'unknown'
}

const readManifest = async path => {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    return parsed !== null && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * A zero exit only proves the command ran. pnpm can skip a too-new version
 * and still exit zero, so the landed manifest is what makes the answer true.
 */
async function confirmInstalled({ profileDir, expected, settleDelayMs, attempts = 3 }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const installed = (await readManifest(join(profileDir, 'node_modules', PACKAGE_NAME, 'package.json')))?.version
    if (installed === expected) return
    if (attempt < attempts) await new Promise(resolve => { setTimeout(resolve, settleDelayMs) })
  }
  throw new Error(UPDATE_ERRORS.versionUpdateNotInstalled)
}

/**
 * Find the profile that owns this running installation. pnpm symlinks resolve
 * to the same realpath on both sides. When no realpath matches, fall back to
 * the only profile that declares the dependency at all.
 */
export async function findInstall({ dshHome, ownPackageJsonUrl }) {
  let ownReal
  try {
    ownReal = await realpath(fileURLToPath(ownPackageJsonUrl))
  } catch {
    ownReal = undefined
  }
  let entries = []
  try {
    entries = await readdir(join(dshHome, 'profiles'), { withFileTypes: true })
  } catch {
    entries = []
  }
  const declared = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const profileDir = join(dshHome, 'profiles', entry.name)
    const spec = (await readManifest(join(profileDir, 'package.json')))?.dependencies?.[PACKAGE_NAME]
    if (typeof spec !== 'string') continue
    declared.push({ profile: entry.name, spec })
    if (ownReal === undefined) continue
    try {
      const installed = await realpath(join(profileDir, 'node_modules', PACKAGE_NAME, 'package.json'))
      if (installed === ownReal) return { kind: classifySpec(spec), profile: entry.name }
    } catch {
      // Declared, but not resolvable in this profile.
    }
  }
  if (declared.length === 1) return { kind: classifySpec(declared[0].spec), profile: declared[0].profile }
  return { kind: 'unknown' }
}

/** Run pnpm host-side. Its output is never returned to the browser. */
function spawnRunCommand({ command, args, cwd }, { signal, timeoutMs, env }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error('ApophisCode plugin update aborted'))
      return
    }
    const controller = new AbortController()
    const onAbort = () => controller.abort(signal.reason)
    signal?.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => controller.abort(new Error(UPDATE_ERRORS.versionUpdateTimedOut)), timeoutMs)
    let settled = false
    const settle = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      callback(value)
    }
    let child
    try {
      child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        env,
        signal: controller.signal,
        ...(cwd === undefined ? {} : { cwd }),
      })
    } catch (error) {
      settle(reject, error)
      return
    }
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', chunk => { stdout = (stdout + chunk).slice(-8192) })
    child.stderr?.on('data', chunk => { stderr = (stderr + chunk).slice(-8192) })
    child.on('error', error => settle(reject, controller.signal.aborted ? controller.signal.reason : error))
    child.on('close', code => {
      if (controller.signal.aborted) {
        const reason = controller.signal.reason
        settle(reject, reason instanceof Error ? reason : new Error('ApophisCode plugin update aborted'))
        return
      }
      settle(resolve, { code: code ?? 1, stdout, stderr })
    })
  })
}

/**
 * The running version, the latest registry version, which profile installed
 * this copy, and registry-spec updates against that profile.
 */
export function createApophisCodePluginManager({
  fetchImpl = ambientFetch,
  runCommand = spawnRunCommand,
  execPath = process.execPath,
  argv = process.argv,
  env = process.env,
  platform = process.platform,
  ownPackageJsonUrl = new URL('../package.json', import.meta.url),
  registryUrl = NPM_REGISTRY_LATEST_URL,
  now = Date.now,
  ttlMs = DEFAULT_VERSION_TTL_MS,
  timeoutMs = DEFAULT_VERSION_TIMEOUT_MS,
  updateTimeoutMs = DEFAULT_UPDATE_TIMEOUT_MS,
  settleDelayMs = DEFAULT_SETTLE_DELAY_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('ApophisCode plugin manager requires fetch')
  if (typeof runCommand !== 'function') throw new Error('ApophisCode plugin manager requires runCommand')
  const dshHome = typeof env.DSH_HOME === 'string' && env.DSH_HOME !== '' ? env.DSH_HOME : join(homedir(), '.dsh')
  // Snapshot at manager creation: an on-disk replacement does not reload code.
  const ownManifest = readManifest(fileURLToPath(ownPackageJsonUrl))
  let updating = false

  const fetchLatest = async signal => {
    let response
    try {
      response = await boundedFetch(registryUrl, { headers: { Accept: 'application/json' } }, { fetchImpl, timeoutMs, signal })
    } catch (error) {
      if (error.aborted) throw error.cause
      throw new Error('ApophisCode plugin version check failed')
    }
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error('ApophisCode plugin version check failed')
    let version
    try {
      version = (await response.json())?.version
    } catch {
      version = undefined
    }
    if (parseSemver(version) === undefined) throw new Error('ApophisCode plugin version check failed')
    return version
  }

  const readOwnVersion = async () => {
    const version = (await ownManifest)?.version
    if (parseSemver(version) === undefined) throw new Error('ApophisCode plugin version is unavailable')
    return version
  }

  const load = async signal => {
    signal?.throwIfAborted()
    if (registryUrl == null) {
      const [current, install] = await Promise.all([readOwnVersion(), findInstall({ dshHome, ownPackageJsonUrl })])
      return { current, install, onlineUpdates: false, updateAvailable: false, fetchedAt: now() }
    }
    const [current, install, latest] = await Promise.all([
      readOwnVersion(),
      findInstall({ dshHome, ownPackageJsonUrl }),
      fetchLatest(signal),
    ])
    const installed = install.profile === undefined ? undefined
      : (await readManifest(join(dshHome, 'profiles', install.profile, 'node_modules', PACKAGE_NAME, 'package.json')))?.version
    const restartRequired = parseSemver(installed) !== undefined && installed !== current
    return {
      current,
      ...(latest === undefined ? { published: false } : { latest }),
      ...(restartRequired ? { installed, restartRequired: true } : {}),
      updateAvailable: !restartRequired && compareSemver(latest, current) === 1,
      install,
      fetchedAt: now(),
    }
  }

  const cache = createCachedRead(load, { ttlMs, now })

  return Object.freeze({
    read: options => cache.read(options),

    async update({ signal } = {}) {
      signal?.throwIfAborted()
      if (registryUrl == null) throw new Error('ApophisCode plugin has no online update source; rebuild and reinstall the local package')
      if (updating) throw new Error('ApophisCode plugin update is already running')
      updating = true
      try {
        const install = await findInstall({ dshHome, ownPackageJsonUrl })
        if (install.kind === 'link') throw new Error('ApophisCode plugin is installed from a local file or checkout')
        if (install.kind !== 'npm' || install.profile === undefined) {
          throw new Error('ApophisCode plugin update could not find the owning profile')
        }
        const latest = await fetchLatest(signal)
        if (latest === undefined) throw new Error('ApophisCode plugin has no published latest version')
        const current = await readOwnVersion()
        const profileDir = join(dshHome, 'profiles', install.profile)
        const installed = (await readManifest(join(profileDir, 'node_modules', PACKAGE_NAME, 'package.json')))?.version
        if (compareSemver(latest, current) !== 1 || compareSemver(latest, installed) !== 1) {
          throw new Error('ApophisCode plugin update requires a newer version than the running and installed versions')
        }
        let result
        try {
          const launcher = resolvePnpmLauncher({ argv, execPath, env, platform })
          result = await runCommand({
            command: launcher.command,
            args: [...launcher.prefix, 'add', '--save-exact', '--registry=https://registry.npmjs.org/', `${PACKAGE_NAME}@${latest}`],
            cwd: profileDir,
          }, { signal, timeoutMs: updateTimeoutMs, env: withProgramDirOnPath(env, execPath, platform) })
        } catch (error) {
          if (signal?.aborted) throw error
          if ([UPDATE_ERRORS.versionUpdateInstallerFailed, UPDATE_ERRORS.versionUpdateTimedOut].includes(error?.message)) {
            throw new Error(error.message)
          }
          if (['ENOENT', 'EINVAL', 'ENOEXEC'].includes(error?.code)) throw new Error(UPDATE_ERRORS.versionUpdateInstallerFailed)
          throw new Error(installerFailure({ code: error?.code }))
        }
        if (result.code !== 0) {
          // Not a failure to retry blindly: pnpm installs it once old enough.
          const refusal = releaseAgeRefusal(`${result.stdout ?? ''}\n${result.stderr ?? ''}`, now())
          if (refusal !== undefined) return { version: latest, profile: install.profile, pending: true, ...refusal }
          throw new Error(installerFailure(result))
        }
        await confirmInstalled({ profileDir, expected: latest, settleDelayMs })
        cache.invalidate()
        return { version: latest, profile: install.profile }
      } finally {
        updating = false
      }
    },

    invalidate: () => cache.invalidate(),
  })
}
