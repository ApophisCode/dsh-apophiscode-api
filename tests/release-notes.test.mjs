import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { parseReleaseNotes, readReleaseNotes } from '../scripts/release-notes.mjs'

const SCRIPT = fileURLToPath(new URL('../scripts/release-notes.mjs', import.meta.url))
const NOTES = '# v1.2.9：修复清空全部 Key 报错\n\n修复说明。\n\n在 DSH 插件管理中更新至 **1.2.9**，然后重新打开 DSH 加载新版。\n'

test('every release notes file names its own version and tells readers to update to it', () => {
  const files = readdirSync(new URL('../docs/release-notes/', import.meta.url)).filter(name => name.endsWith('.md'))
  assert.ok(files.length > 0)
  for (const name of files) {
    const version = /^v(\d+\.\d+\.\d+)\.md$/u.exec(name)?.[1]
    assert.ok(version, `${name}: notes are named v<version>.md`)
    const { title, body } = readReleaseNotes(version)
    assert.match(title, new RegExp(`^v${version.replaceAll('.', '\\.')}：\\S`, 'u'), name)
    assert.ok(body.includes(`**${version}**`), name)
  }
})

test('the package version has its own release notes', () => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.doesNotThrow(() => readReleaseNotes(version), `write docs/release-notes/v${version}.md`)
})

test('notes split into the release title and body', () => {
  assert.deepEqual(parseReleaseNotes(NOTES, '1.2.9'), {
    title: 'v1.2.9：修复清空全部 Key 报错',
    body: '修复说明。\n\n在 DSH 插件管理中更新至 **1.2.9**，然后重新打开 DSH 加载新版。\n',
  })
  assert.equal(parseReleaseNotes(NOTES.replaceAll('\n', '\r\n'), '1.2.9').title, 'v1.2.9：修复清空全部 Key 报错')
})

test('malformed or mismatched notes are refused with the reason', () => {
  const cases = [
    [NOTES.replace('# v1.2.9：', '# v1.2.9: '), /must start with "# v1\.2\.9：<title>"/u],
    [NOTES.replace('# v1.2.9：修复清空全部 Key 报错', '# v1.2.9：'), /must start with/u],
    [NOTES.replace('# v1.2.9：', '# v1.2.8：'), /titled v1\.2\.8, not v1\.2\.9/u],
    ['# v1.2.9：标题\n\n   \n', /have no body/u],
    [NOTES.replace('**1.2.9**', '**1.2.8**'), /update to \*\*1\.2\.9\*\*/u],
    ['修复说明。', /must start with/u],
  ]
  for (const [text, reason] of cases) assert.throws(() => parseReleaseNotes(text, '1.2.9'), reason)
  assert.throws(() => parseReleaseNotes(NOTES, 'v1.2.9'), /plain version/u)
  assert.throws(() => readReleaseNotes('0.0.0'), /docs\/release-notes\/v0\.0\.0\.md is missing/u)
})

test('the script prints the title, writes the body, and exits 1 on missing notes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'apophis-release-notes-'))
  try {
    const bodyFile = join(directory, 'body.md')
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    const title = execFileSync(process.execPath, [SCRIPT, version, '--body-file', bodyFile], { encoding: 'utf8' })
    const notes = readReleaseNotes(version)
    assert.equal(title, `${notes.title}\n`)
    assert.equal(readFileSync(bodyFile, 'utf8'), notes.body)
    assert.throws(() => execFileSync(process.execPath, [SCRIPT, '0.0.0'], { stdio: 'pipe' }), error => error.status === 1 && /is missing/u.test(String(error.stderr)))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
