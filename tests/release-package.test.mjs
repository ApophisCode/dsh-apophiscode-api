import assert from 'node:assert/strict'
import { readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = (path, encoding = 'utf8') => readFile(new URL(`../${path}`, import.meta.url), encoding)

test('plugin card icon is declared, packaged, and within the host byte limit', async () => {
  const manifest = JSON.parse(await read('package.json'))
  assert.equal(manifest.icon, './icon-subscription.webp', 'DSH reads the top-level icon field')
  assert.equal(manifest.exports['./package.json'], './package.json', 'DSH must resolve the exported manifest')

  const root = await realpath(fileURLToPath(new URL('../', import.meta.url)))
  const iconPath = await realpath(resolve(root, manifest.icon))
  const local = relative(root, iconPath)
  assert.ok(!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`), 'icon must remain inside the package')
  assert.ok((await stat(iconPath)).isFile(), 'icon must be a regular file')
  assert.ok(manifest.files.includes(manifest.icon.slice(2)), 'publish files must include the icon')

  const bytes = await readFile(iconPath)
  assert.ok(bytes.length > 0 && bytes.length <= 256 * 1024, 'DSH admits icon files of at most 256 KiB')
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'WebP container must be complete')
})

test('repository metadata identifies ApophisCode and preserves the MIT copyright', async () => {
  const manifest = JSON.parse(await read('package.json'))
  assert.equal(manifest.name, 'dsh-apophiscode-api')
  assert.equal(manifest.private, false)
  assert.deepEqual(manifest.publishConfig, { access: 'public', registry: 'https://registry.npmjs.org/' })
  assert.equal(manifest.repository.url, 'https://github.com/ApophisCode/dsh-apophiscode-api.git')
  assert.equal(manifest.upstream, undefined)
  assert.ok((await read('LICENSE')).includes('Copyright (c) 2026 BaronCyrus'))
  for (const path of ['README.md', 'README.en.md']) {
    const content = await read(path)
    assert.ok(content.includes('ApophisCode'))
    assert.ok(content.includes('https://www.apophis.uk'))
  }
})

test('release package includes every local README image', async () => {
  const manifest = JSON.parse(await read('package.json'))
  for (const path of ['README.md', 'README.en.md']) {
    const images = [...(await read(path)).matchAll(/<img\b[^>]*\bsrc="(docs\/[^"]+)"/g)].map(match => match[1])
    for (const image of images) {
      assert.ok(manifest.files.includes(image), `package files must include ${image}`)
      assert.ok((await read(image, null)).length > 0, `${image} must exist and be nonempty`)
    }
  }
})
