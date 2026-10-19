#!/usr/bin/env node
// Enumerate the public snapshot without changing files or Git history.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

function relativePath(value) {
  if (typeof value !== 'string' || !value || /[\\\0:*?]/u.test(value)
    || value.startsWith('/') || value.split('/').some(part => part === '.' || part === '..' || part === '')) {
    throw new Error(`Expected a repository-relative path: ${JSON.stringify(value)}`)
  }
  return value
}

export function selectPublicationFiles(tracked, rules) {
  if (!Array.isArray(rules?.directories) || !Array.isArray(rules?.files)) {
    throw new Error('Publication rules require directories and files arrays')
  }
  const directories = rules.directories.map(value => {
    if (typeof value !== 'string' || !value.endsWith('/')) throw new Error('Excluded directories must end with /')
    return `${relativePath(value.slice(0, -1))}/`
  })
  const exact = new Set(rules.files.map(relativePath))
  const files = []
  const excluded = []
  for (const path of [...new Set(tracked.map(relativePath))].sort()) {
    const omit = exact.has(path) || directories.some(directory => path.startsWith(directory))
    ;(omit ? excluded : files).push(path)
  }
  return { files, excluded }
}

export function readPublicationFiles(directory = root) {
  const rules = JSON.parse(readFileSync(resolve(directory, '.publication-exclude'), 'utf8'))
  const tracked = execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: directory, encoding: 'utf8' })
    .split('\0').filter(Boolean)
  return selectPublicationFiles(tracked, rules)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2)
    if (args.length > 1 || (args.length === 1 && args[0] !== '--json')) {
      throw new Error('Usage: node scripts/publication-files.mjs [--json]')
    }
    const result = readPublicationFiles()
    console.log(args[0] === '--json' ? JSON.stringify(result, null, 2) : result.files.join('\n'))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
