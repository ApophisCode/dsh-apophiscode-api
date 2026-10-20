import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const exec = promisify(execFile)
const managerUrl = new URL('../src/plugin-version.js', import.meta.url).href
const rpcUrl = new URL('../src/rpc.js', import.meta.url).href
const PACKAGE_NAME = 'dsh-apophiscode-api'

/** Real processes and a private profile; the pnpm fixture never contacts a registry. */
async function updateProcess({ launcher = 'path', outcome = 'success', corepack = false, brokenShim = false, retry = false, linkedScript = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'apophiscode-update-process-'))
  const profile = join(root, 'profiles', 'web')
  const ownManifest = join(profile, 'node_modules', PACKAGE_NAME, 'package.json')
  const bin = join(root, 'pnpm shim & spaces')
  const program = corepack ? join(bin, 'node_modules', 'corepack', 'dist', 'pnpm.js')
    : join(bin, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
  await mkdir(dirname(ownManifest), { recursive: true })
  await mkdir(dirname(program), { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { [PACKAGE_NAME]: '0.1.4' } }))
  await writeFile(ownManifest, JSON.stringify({ name: PACKAGE_NAME, version: '0.1.4' }))
  await writeFile(program, `
    const assert = require('node:assert/strict')
    const fs = require('node:fs')
    const path = require('node:path')
    assert.deepEqual(process.argv.slice(2), ['add', '--save-exact', '--registry=https://registry.npmjs.org/', '${PACKAGE_NAME}@0.1.5'])
    // macOS exposes /var through /private/var; require the same physical profile.
    assert.equal(fs.realpathSync(process.cwd()), fs.realpathSync(${JSON.stringify(profile)}))
    const outcome = ${JSON.stringify(outcome)}
    if (outcome === 'pending') {
      console.error('ERR_PNPM_NO_MATURE_MATCHING_VERSION offline fixture')
      process.exit(1)
    }
    if (outcome === 'network') {
      console.error('ERR_PNPM_META_FETCH_FAIL request failed: ECONNRESET fixture-private-text')
      process.exit(1)
    }
    if (outcome === 'not-installed') process.exit(0)
    if (outcome === 'timeout') { setInterval(() => {}, 1000); return }
    fs.writeFileSync(path.join(process.cwd(), 'node_modules', '${PACKAGE_NAME}', 'package.json'), JSON.stringify({ name: '${PACKAGE_NAME}', version: '0.1.5' }))
  `)
  if (process.platform === 'win32') {
    const relative = brokenShim ? 'missing\\pnpm.cjs'
      : corepack ? 'node_modules\\corepack\\dist\\pnpm.js' : 'node_modules\\pnpm\\bin\\pnpm.cjs'
    const base = corepack ? '%dp0%' : '%~dp0'
    await writeFile(join(bin, 'pnpm.cmd'), `@ECHO off\r\nnode "${base}\\${relative}" %*\r\n`)
  } else if (linkedScript) {
    await symlink(program, join(bin, 'pnpm'))
  } else {
    await writeFile(join(bin, 'pnpm'), `#!/usr/bin/env node\nrequire(${JSON.stringify(program)})\n`, { mode: 0o755 })
  }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'))
  env.PATH = launcher === 'path' ? bin : root
  // Prevent an installed global pnpm from concealing a missing fixture.
  env.APPDATA = root
  env.PNPM_HOME = launcher === 'pnpm-home' ? bin : ''
  const argv = [process.execPath, '/dsh/lib/bin.js']
  if (launcher === 'bundled') argv.push(program)
  if (launcher === 'runtime') {
    const runtime = join(root, 'runtime', 'dsh')
    const manifest = join(runtime, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
    const bundled = join(runtime, '..', 'pnpm', 'bin', 'pnpm.mjs')
    await mkdir(dirname(manifest), { recursive: true })
    await writeFile(manifest, '{}')
    await mkdir(dirname(bundled), { recursive: true })
    await writeFile(bundled, `import ${JSON.stringify(pathToFileURL(program).href)}\n`)
    argv.push(runtime)
  }
  const recoveredProgram = `require('node:fs').writeFileSync(${JSON.stringify(ownManifest)}, ${JSON.stringify(JSON.stringify({ name: PACKAGE_NAME, version: '0.1.5' }))})`
  const source = `
    import { pathToFileURL } from 'node:url'
    import { createApophisCodePluginManager } from ${JSON.stringify(managerUrl)}
    import { createApophisCodeRpc } from ${JSON.stringify(rpcUrl)}
    const pluginManager = createApophisCodePluginManager({
      env: { ...process.env, DSH_HOME: ${JSON.stringify(root)} },
      argv: ${JSON.stringify(argv)},
      ownPackageJsonUrl: pathToFileURL(${JSON.stringify(ownManifest)}),
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ version: '0.1.5' }) }),
      settleDelayMs: 1,
      updateTimeoutMs: 1000,
    })
    const rpc = createApophisCodeRpc({ pluginManager })
    const before = await rpc('plugin/version', { force: true })
    const update = await rpc('plugin/update', {})
    let retried
    if (${JSON.stringify(retry)}) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(${JSON.stringify(program)}, ${JSON.stringify(recoveredProgram)})
      retried = await rpc('plugin/update', {})
    }
    const after = await rpc('plugin/version', { force: true })
    console.log(JSON.stringify({ before, update, after, retried }))
  `
  const { stdout } = await exec(process.execPath, ['--input-type=module', '--eval', source], { env, timeout: 10_000, windowsHide: true })
  return JSON.parse(stdout)
}

test('a CLI host can update through PATH pnpm using the real process launcher and RPC', async () => {
  const { before, update, after } = await updateProcess()
  assert.equal(before.value.updateAvailable, true)
  assert.deepEqual(update, { ok: true, value: { version: '0.1.5', profile: 'web' } })
  assert.equal(after.value.current, '0.1.4')
  assert.equal(after.value.installed, '0.1.5')
  assert.equal(after.value.restartRequired, true)
  assert.equal(after.value.updateAvailable, false)
})

for (const launcher of ['bundled', 'runtime', 'pnpm-home']) {
  test(`the real updater also runs with ${launcher} pnpm and no pnpm on PATH`, async () => {
    const { update, after } = await updateProcess({ launcher })
    assert.equal(update.ok, true, JSON.stringify(update))
    assert.equal(after.value.installed, '0.1.5')
    assert.equal(after.value.restartRequired, true)
  })
}

test('Corepack pnpm shims can start without a shell', async () => {
  assert.equal((await updateProcess({ corepack: true })).update.ok, true)
})

test('a real pnpm release-age refusal keeps the update available without claiming installation', async () => {
  const { update, after } = await updateProcess({ outcome: 'pending' })
  assert.deepEqual(update, { ok: true, value: { version: '0.1.5', profile: 'web', pending: true } })
  assert.equal(after.value.current, '0.1.4')
  assert.equal(after.value.restartRequired, undefined)
  assert.equal(after.value.updateAvailable, true)
})

for (const [outcome, message] of [
  ['network', 'ApophisCode plugin update could not reach the package registry'],
  ['timeout', 'ApophisCode plugin update timed out'],
  ['not-installed', 'ApophisCode plugin update did not install the requested version'],
]) {
  test(`a real installer ${outcome} failure has a safe reason and remains retryable`, async () => {
    const { update, after } = await updateProcess({ outcome })
    assert.equal(update.ok, false)
    assert.equal(update.error.message, message)
    assert.equal(JSON.stringify(update).includes('fixture-private-text'), false)
    assert.equal(after.value.restartRequired, undefined)
    assert.equal(after.value.updateAvailable, true)
  })
}

test('a failed installer can be retried successfully in the same running manager', async () => {
  const { update, retried, after } = await updateProcess({ outcome: 'network', retry: true })
  assert.equal(update.ok, false)
  assert.deepEqual(retried, { ok: true, value: { version: '0.1.5', profile: 'web' } })
  assert.equal(after.value.installed, '0.1.5')
})

if (process.platform === 'win32') {
  test('a broken Windows pnpm shim reports a safe startup error without exposing its path', async () => {
    const { update, after } = await updateProcess({ brokenShim: true })
    assert.equal(update.ok, false)
    assert.equal(update.error.message, 'ApophisCode plugin update could not start the installer')
    assert.equal(after.value.updateAvailable, true)
    assert.equal(after.value.restartRequired, undefined)
  })
} else {
  test('POSIX pnpm script symlinks use the host Node without requiring node on PATH', async () => {
    const { update, after } = await updateProcess({ linkedScript: true })
    assert.equal(update.ok, true, JSON.stringify(update))
    assert.equal(after.value.installed, '0.1.5')
  })
}
