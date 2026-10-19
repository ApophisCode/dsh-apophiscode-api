import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { parse } from 'yaml'

import { prepareRelease, validateRelease, PACKAGE_NAME, REGISTRY } from '../scripts/release-preflight.mjs'
import { verifyRegistryRelease } from '../scripts/verify-registry-release.mjs'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('publication requires manual main-branch dispatch and separates preparation from write permissions', async () => {
  const text = await readFile(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8')
  const workflow = parse(text)
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch'])
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assert.equal(workflow.on.workflow_dispatch.inputs.mode.default, 'prepare')
  const { prepare, publish, release } = workflow.jobs
  assert.equal(prepare.if, "github.ref == 'refs/heads/main'")
  assert.equal(prepare.permissions, undefined)
  assert.match(prepare.steps.map(step => step.run ?? '').join('\n'), /pnpm run check/u)
  assert.equal(publish.if, "inputs.mode == 'publish'")
  assert.deepEqual(publish.permissions, { contents: 'read', 'id-token': 'write' })
  assert.deepEqual(release.permissions, { contents: 'write' })
  assert.deepEqual(release.needs, ['prepare', 'publish'])
  const releaseRun = release.steps.at(-1).run
  assert.ok(releaseRun.indexOf('verify-registry-release.mjs') < releaseRun.indexOf('gh release create'))
  assert.match(releaseRun, /--target "\$GITHUB_SHA"/u)
  assert.doesNotMatch(text, /NODE_AUTH_TOKEN|NPM_TOKEN|secrets\.|--force/u)
  for (const job of Object.values(workflow.jobs)) {
    for (const step of job.steps) assert.doesNotMatch(step.run ?? '', /\$\{\{\s*inputs\./u, 'dispatch input goes through env, never shell source')
  }
  const ci = parse(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'))
  assert.doesNotMatch(JSON.stringify(ci.jobs), /npm publish|gh release/u)
})

test('preflight rejects a mismatched, private, foreign or malformed release', () => {
  assert.equal(validateRelease(manifest, manifest.version), `${PACKAGE_NAME}-${manifest.version}.tgz`)
  for (const version of ['v0.1.1', '0.1.1-rc.1', '0.1.1;echo bad', '../0.1.1', '00.1.1', '9.9.9']) {
    assert.throws(() => validateRelease(manifest, version))
  }
  for (const patch of [{ name: 'dsh-other-provider-api' }, { private: true }, { repository: { url: 'https://other.example/repo' } }, { publishConfig: { access: 'public', registry: 'https://other.example/' } }]) {
    assert.throws(() => validateRelease({ ...manifest, ...patch }, manifest.version))
  }
})

test('preparation requires notes and changelog, then preserves the packed bytes and checksum', async t => {
  const root = await mkdtemp(join(tmpdir(), 'apophis-release-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest))
  await assert.rejects(() => prepareRelease(manifest.version, root), /is missing/u)
  await mkdir(join(root, 'docs', 'release-notes'), { recursive: true })
  await writeFile(join(root, 'docs', 'release-notes', `v${manifest.version}.md`), `# v${manifest.version}：测试说明\n\n安装 **${manifest.version}**。\n`)
  await writeFile(join(root, 'CHANGELOG.md'), '# Changelog\n')
  await assert.rejects(() => prepareRelease(manifest.version, root), /CHANGELOG/u)
  await writeFile(join(root, 'CHANGELOG.md'), `## ${manifest.version} — Test\n`)
  await mkdir(join(root, '.artifacts'))
  const bytes = Buffer.from('offline tarball fixture')
  const filename = `${PACKAGE_NAME}-${manifest.version}.tgz`
  await writeFile(join(root, '.artifacts', filename), bytes)
  const output = await prepareRelease(manifest.version, root)
  assert.deepEqual(await readFile(join(output, filename)), bytes)
  assert.equal(await readFile(join(output, 'SHA256SUMS'), 'utf8'), `${createHash('sha256').update(bytes).digest('hex')}  ${filename}\n`)
  assert.match(await readFile(join(output, 'title.txt'), 'utf8'), /测试说明/u)
})

test('registry verification rejects absence, wrong identity and any changed tarball bytes', async () => {
  const version = manifest.version
  const bytes = Buffer.from('offline registry fixture')
  const metadata = { name: PACKAGE_NAME, version, dist: { integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` } }
  const fetchImpl = async (url, options) => {
    assert.equal(url, `${REGISTRY}${PACKAGE_NAME}/${version}`)
    assert.equal(options.redirect, 'error')
    return { ok: true, json: async () => metadata }
  }
  assert.equal(await verifyRegistryRelease(version, bytes, { fetchImpl }), metadata.dist.integrity)
  await assert.rejects(() => verifyRegistryRelease(version, Buffer.from('changed bytes'), { fetchImpl }), /integrity differs/u)
  metadata.name = 'dsh-other-provider-api'
  await assert.rejects(() => verifyRegistryRelease(version, bytes, { fetchImpl }), /identity or integrity/u)
  await assert.rejects(() => verifyRegistryRelease(version, bytes, { fetchImpl: async () => ({ ok: false, status: 404 }) }), /HTTP 404/u)
})
