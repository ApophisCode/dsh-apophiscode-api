import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'

test('the bundled Google native API works with the target DSH 0.2.0 host adapter and tools', { timeout: 15000 }, async t => {
  const child = spawn(process.execPath, ['--test', 'tests/fixtures/gemini-host-v020.mjs'], {
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  })
  t.after(() => { if (child.exitCode === null) child.kill() })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
  assert.equal(code, 0, output)
  assert.match(output, /pass 2/u)
})
