/** Locate the host's pnpm and launch it without a shell on every platform. */
import { existsSync, readFileSync, realpathSync } from 'node:fs'

import { pathFor, searchPath } from './locate.js'
import { UPDATE_ERRORS } from './plugin-update-errors.js'

const isExistingPath = value => typeof value === 'string' && value !== '' && existsSync(value)
const PNPM_SCRIPT = /[\\/]pnpm\.(?:mjs|cjs|js)$/u
const SHIM_TARGET = /"%(?:~dp0|dp0%)\\([^"%\r\n]+?\.(?:c?js|mjs|exe))"/giu

/** Prefer pnpm supplied by a desktop host, including its installation-owned runtime. */
export function resolvePnpm({ argv, platform = process.platform } = {}) {
  const path = pathFor(platform)
  const entries = Array.isArray(argv) ? argv : []
  for (const entry of entries) {
    if (isExistingPath(entry) && PNPM_SCRIPT.test(entry)) return entry
  }
  for (const entry of entries) {
    if (!isExistingPath(entry) || !existsSync(path.join(entry, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'))) continue
    const script = path.join(entry, '..', 'pnpm', 'bin', 'pnpm.mjs')
    if (existsSync(script)) return script
  }
  return undefined
}

/** npm/Corepack shims forward to a JS file or executable beside the shim. */
function windowsShimTarget(binary) {
  const path = pathFor('win32')
  let shim
  try {
    shim = readFileSync(binary, 'utf8')
  } catch {
    throw new Error(UPDATE_ERRORS.versionUpdateInstallerFailed)
  }
  const target = [...shim.matchAll(SHIM_TARGET)]
    .map(match => match[1])
    .find(value => !/^node\.exe$/iu.test(value))
  if (target === undefined) throw new Error(UPDATE_ERRORS.versionUpdateInstallerFailed)
  const program = path.resolve(path.dirname(binary), target)
  if (!existsSync(program)) throw new Error(UPDATE_ERRORS.versionUpdateInstallerFailed)
  return program
}

/** PATH, then known installation locations when a GUI host has a short PATH. */
export function resolvePnpmLauncher({ argv, execPath, env = process.env, platform = process.platform }) {
  const bundled = resolvePnpm({ argv, platform })
  if (bundled !== undefined) return { command: execPath, prefix: [bundled] }
  const path = pathFor(platform)
  const names = platform === 'win32' ? ['pnpm.exe', 'pnpm.cmd'] : ['pnpm']
  const directories = [
    ...(typeof env.PNPM_HOME === 'string' && env.PNPM_HOME !== '' ? [env.PNPM_HOME] : []),
    path.dirname(execPath),
    ...(platform === 'win32' && env.APPDATA ? [path.join(env.APPDATA, 'npm')] : []),
    ...(platform === 'win32' ? [] : ['/opt/homebrew/bin', '/usr/local/bin']),
  ]
  const binary = searchPath(names, { env, platform })
    ?? directories.flatMap(directory => names.map(name => path.join(directory, name))).find(isExistingPath)
  // Keep the normal executable lookup for hosts whose process runner supplies pnpm.
  if (binary === undefined) return { command: 'pnpm', prefix: [] }
  const program = platform === 'win32' && /\.cmd$/iu.test(binary) ? windowsShimTarget(binary) : realpathSync(binary)
  if (/\.(?:mjs|cjs|js)$/iu.test(program)) return { command: execPath, prefix: [program] }
  return { command: program, prefix: [] }
}
