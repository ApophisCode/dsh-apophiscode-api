/** Explicit offline gateway declarations for historical protocol/tool regression tests.
 * No production defaults: tests inject these as if returned by their mock gateway.
 */
import { readFileSync } from 'node:fs'
import { createApophisCodeCatalog as catalog, declaredMetadata } from '../../src/catalog.js'
import { createApophisCodeProvider as provider } from '../../src/provider.js'
import { createRouteAdapter as route } from '../../src/route.js'
export { guardKeyRotation } from '../../src/provider.js'
export * from '../../src/index.js'
const fixture = JSON.parse(readFileSync(new URL('./model-declarations.json', import.meta.url)))
export const MODEL_ROWS = fixture.rows
export const APOPHISCODE_MODEL_IDS = fixture.defaultIds
export const APOPHISCODE_MODELS = catalog(undefined, { models: MODEL_ROWS.filter(row => fixture.defaultIds.includes(row.id)).map(row => ({ id: row.id, ...declaredMetadata(row) })) })
export const modelRow = id => MODEL_ROWS.find(row => row.id === id) ?? { id }
export function createApophisCodeCatalog(host, { includeLegacy = false, modelIds, models } = {}) {
  return catalog(host, { models: models ?? MODEL_ROWS.filter(row => modelIds ? [...modelIds].includes(row.id) : includeLegacy || fixture.defaultIds.includes(row.id)).map(row => ({ id: row.id, ...declaredMetadata(row) })) })
}
export function createApophisCodeProvider(options = {}) {
  return provider({ ...options, models: options.models ?? MODEL_ROWS.map(row => ({ id: row.id, ...declaredMetadata(row) })) })
}
export function createRouteAdapter(options) {
  return route({ ...options, availableModels: options.availableModels ?? (options.availableModelIds === undefined
    ? async () => MODEL_ROWS
    : async () => [...await options.availableModelIds()].map(modelRow)) })
}

/** Install a fully offline gateway: directory requests never reach real hosts. */
export function mockGateway(t, handler, rows = MODEL_ROWS) {
  return t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    if (request.method === 'GET' && new URL(request.url).pathname.endsWith('/v1/models')) return Response.json({ data: rows })
    return handler(request)
  })
}
