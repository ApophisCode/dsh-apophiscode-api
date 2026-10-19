import { defineConfig } from 'tsdown'
import { googleSdkBoundary } from './scripts/google-sdk-boundary.mjs'

const id = 'dsh-apophiscode-api'
const hostExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-credentials',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-tools',
  '@deepseek-ai/schemastery',
  '@earendil-works/pi-ai',
  '@earendil-works/pi-ai/api/anthropic-messages.lazy',
  '@earendil-works/pi-ai/api/lazy',
  '@earendil-works/pi-ai/api/openai-completions.lazy',
  '@earendil-works/pi-ai/api/openai-responses.lazy',
]
const clientExternal = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
]

export default defineConfig([
  {
    name: id,
    entry: { index: 'src/index.js' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: true,
    // pnpm installation paths differ across platforms and are not runtime data.
    inputOptions: { experimental: { attachDebugInfo: 'none' } },
    plugins: [googleSdkBoundary(hostExternal)],
    deps: { neverBundle: hostExternal, alwaysBundle: [
      /^@earendil-works\/pi-ai\/api\/google-generative-ai$/u,
      /^@google\/genai(?:\/|$)/u,
    ] },
  },
  {
    name: `${id}/client`,
    entry: { client: 'src/client.jsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    inputOptions: { experimental: { attachDebugInfo: 'none' } },
    deps: { neverBundle: clientExternal },
    define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
