/** Explicit request destinations owned by this plugin. */
import { DEFAULT_API_HOST, DEFAULT_STATUS_HOST } from './constants.js'

/** Accept an absolute http(s) origin and drop a trailing slash. */
export function normalizeHost(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return fallback
  let url
  try {
    url = new URL(text)
  } catch {
    return fallback
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallback
  return `${url.origin}${url.pathname.replace(/\/+$/u, '')}`
}

/** Service root for clients appending protocol paths; preserve custom prefixes. */
export function apiRootHost(value, fallback = DEFAULT_API_HOST) {
  return normalizeHost(value, fallback).replace(/\/v1(?:beta)?$/u, '')
}

/** A status read stays on its configured target, including on failure. */
export function statusHostOrder(hosts) {
  return [apiRootHost(hosts?.statusHost, DEFAULT_STATUS_HOST)]
}
