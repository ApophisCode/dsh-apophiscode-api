/** Verify the locked local Google SDK patch and audit the actual host bundle. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'
import { builtinModules, createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const SDK_VERSION = '2.21.0'
const PI_VERSION = '1.1.0'
const SDK_SHA256 = '3f97400e838da0874ed74c40f263dc64131e0bfbd302e1dbd403b358b6a7d1a0'
const redirect = "response = await fetch(url, Object.assign(Object.assign({}, requestInit), { signal: attempt.signal, redirect: 'error' }));"
const framedError = "// ApophisCode local patch: preserve framed gateway errors before response projection."
const once = (source, fragment, name) => assert.equal(source.split(fragment).length - 1, 1, `${name} must occur exactly once in the locked SDK`)

function packageAt(path) {
  for (let directory = dirname(path); directory !== parse(directory).root; directory = dirname(directory)) {
    try { return { directory, value: JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) } }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  throw new Error(`No package metadata for bundled module ${path}`)
}

export function googleSdkBoundary(hostExternal) {
  return {
    name: 'apophis-local-google-boundary',
    buildStart() {
      const sdkPath = fileURLToPath(import.meta.resolve('@google/genai'))
      const nativePath = fileURLToPath(import.meta.resolve('@earendil-works/pi-ai/api/google-generative-ai'))
      assert.equal(packageAt(sdkPath).value.version, SDK_VERSION)
      assert.equal(packageAt(nativePath).value.version, PI_VERSION)
      assert.ok(sdkPath.replaceAll('\\', '/').endsWith('/dist/node/index.mjs'))
      const source = readFileSync(sdkPath, 'utf8')
      assert.equal(createHash('sha256').update(source).digest('hex'), SDK_SHA256, 'the SDK must match the reviewed exact patch')
      once(source, redirect, 'redirect rejection patch')
      once(source, framedError, 'framed SSE error patch')
      assert.equal(source.includes('response = await fetch(url, Object.assign(Object.assign({}, requestInit), { signal: attempt.signal }));'), false)
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(value => value.type === 'chunk')
      const packages = new Map()
      for (const chunk of chunks) {
        for (const moduleId of chunk.moduleIds) {
          if (!moduleId.replaceAll('\\', '/').includes('/node_modules/')) continue
          const { value } = packageAt(moduleId)
          packages.set(`${value.name}@${value.version}`, { name: value.name, version: value.version, license: value.license })
        }
      }
      // Rolldown emits a small runtime helper chunk alongside dynamic SDK imports.
      const runtime = packageAt(createRequire(import.meta.resolve('tsdown')).resolve('rolldown')).value
      packages.set(`${runtime.name}@${runtime.version}`, { name: runtime.name, version: runtime.version, license: runtime.license })
      assert.ok(packages.has(`@google/genai@${SDK_VERSION}`), 'the patched SDK must be inlined')
      assert.ok(packages.has(`@earendil-works/pi-ai@${PI_VERSION}`), 'the native Google API must be inlined')
      const imports = [...new Set(chunks.flatMap(chunk => [...chunk.imports, ...chunk.dynamicImports]))].sort()
      assert.equal(imports.some(id => id.startsWith('@google/') || id.includes('google-generative-ai')), false, 'Google must not load an external SDK/API')
      const allowed = new Set([...hostExternal, ...builtinModules, ...builtinModules.map(id => `node:${id}`), ...chunks.map(chunk => chunk.fileName)])
      for (const id of imports) assert.ok(allowed.has(id), `Unexpected external runtime import: ${id}`)
      const notices = JSON.parse(readFileSync('licenses/manifest.json', 'utf8'))
      for (const bundled of packages.values()) {
        const notice = notices.find(entry => entry.name === bundled.name && entry.version === bundled.version)
        assert.ok(notice, `Missing license for ${bundled.name}@${bundled.version}`)
        assert.equal(createHash('sha256').update(readFileSync(notice.file)).digest('hex'), notice.sha256)
      }
      mkdirSync('.artifacts', { recursive: true })
      writeFileSync('.artifacts/google-bundle-audit.json', JSON.stringify({ sdk: SDK_VERSION, nativeApi: PI_VERSION,
        chunks: chunks.map(chunk => ({ file: chunk.fileName, entry: chunk.isEntry, modules: chunk.moduleIds.length })),
        imports, packages: [...packages.values()].sort((a, b) => a.name.localeCompare(b.name)),
      }, null, 2) + '\n')
    },
  }
}
