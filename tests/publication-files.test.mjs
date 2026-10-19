import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { posix } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { readPublicationFiles, selectPublicationFiles } from '../scripts/publication-files.mjs'

test('snapshot rules match whole directories and exact files, even when excluded files are absent', () => {
  const rules = { directories: ['docs/history/'], files: ['local.md'] }
  assert.deepEqual(selectPublicationFiles(['docs/history/a.md', 'docs/history-extra/a.md', 'local.md', 'local.md.bak', 'src/index.js'], rules), {
    files: ['docs/history-extra/a.md', 'local.md.bak', 'src/index.js'],
    excluded: ['docs/history/a.md', 'local.md'],
  })
  assert.deepEqual(selectPublicationFiles(['src/index.js'], rules), { files: ['src/index.js'], excluded: [] })
  assert.throws(() => selectPublicationFiles(['../outside'], rules), /repository-relative/u)
  assert.throws(() => selectPublicationFiles([], { directories: ['docs/history'], files: [] }), /end with/u)
})

test('public snapshot retains runtime and test inputs and has complete local Markdown links', () => {
  const { files } = readPublicationFiles()
  const selected = new Set(files)
  for (const path of ['LICENSE', 'package.json', 'pnpm-lock.yaml', 'src/index.js', 'lib/index.js', 'lib/client.js', 'icon-subscription.webp', 'tests/fixtures/images.mjs', '.publication-exclude', 'scripts/publication-files.mjs', 'scripts/release-notes.mjs', 'scripts/release-preflight.mjs', 'scripts/verify-registry-release.mjs', 'tests/release-notes.test.mjs', 'docs/publishing.md', 'docs/release-notes/v0.1.4.md']) {
    assert.ok(selected.has(path), `${path} must remain public`)
  }
  assert.equal(files.some(path => path.startsWith('.scratch/') || path.startsWith('docs/releases/') || path.startsWith('docs/research/')), false)
  for (const path of ['docs/requirements.md', 'docs/assets/sponsor-wechat.png', 'docs/assets/sponsor-alipay.png']) {
    assert.equal(selected.has(path), false, `${path} is local history`)
  }
  for (const path of files.filter(path => path.endsWith('.md'))) {
    const content = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    for (const [, raw] of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/gu)) {
      if (/^(?:[a-z][a-z\d+.-]*:|#)/iu.test(raw)) continue
      const target = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(raw.split('#')[0])))
      assert.ok(selected.has(target), `${path}: ${raw} must be included in the snapshot`)
    }
  }
})

test('JSON CLI reports the same tracked-file selection without a copy or publish action', () => {
  const script = fileURLToPath(new URL('../scripts/publication-files.mjs', import.meta.url))
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' })), readPublicationFiles())
})
