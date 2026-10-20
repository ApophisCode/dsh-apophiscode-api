import { validateImageOptions, validateImageQuality } from './image-models.js'
import { fieldValue } from './preferences.js'

export function readImagePreference(value = {}) {
  const model = fieldValue(value.imageModel)
  const imageModel = typeof model === 'string' ? model : ''
  const quality = fieldValue(value.imageQuality)
  return {
    imageEnabled: fieldValue(value.imageEnabled) !== false,
    imageModel,
    imageQuality: typeof quality === 'string' && quality !== '' ? quality : 'auto',
  }
}

/** Settings only read the model directory; image generation requires a tool request. */
export function createImageController({ ring, balance, readPreference, writePreference, isWritable, availableModels = async () => [], invalidateModels = () => {} }) {
  let mounted
  let disposeTool
  let generation = 0
  let closed = false
  const preference = () => readImagePreference(readPreference())
  const reconcile = async () => {
    const current = ++generation
    const key = await ring.activeKey()
    if (closed || current !== generation) return
    const enabled = preference().imageEnabled && key !== undefined && mounted !== undefined
    if (enabled && disposeTool === undefined) disposeTool = mounted()
    if (!enabled && disposeTool !== undefined) { disposeTool(); disposeTool = undefined }
  }
  const status = async () => {
    let models = [], modelError
    try { models = await availableModels() }
    catch { modelError = 'ApophisCode image model list could not be read; check the active image key and gateway' }
    return {
      ...preference(),
      ...(await ring.list()),
      writable: isWritable() === true,
      available: mounted !== undefined,
      toolRegistered: disposeTool !== undefined,
      models: models.map(row => ({ id: row.id, qualities: ['auto', ...(row.image_qualities ?? []).filter(value => value !== 'auto')] })),
      ...(modelError === undefined ? {} : { modelError }),
    }
  }
  return {
    preference,
    status,
    invalidateBalance: () => balance?.invalidate(),
    async readBalance({ force = false, signal } = {}) {
      if (balance === undefined) throw new Error('ApophisCode image balance is unavailable in this runtime')
      try {
        const [value, state] = await Promise.all([balance.read({ force, signal }), ring.list()])
        return { ...value, activeId: state.activeId }
      } catch {
        throw new Error('ApophisCode image balance could not be read')
      }
    },
    reconcile,
    mount(register) {
      mounted = register
      closed = false
      void reconcile().catch(() => undefined)
      return () => {
        closed = true
        generation += 1
        mounted = undefined
        disposeTool?.()
        disposeTool = undefined
      }
    },
    async update(value = {}) {
      if (isWritable() !== true) throw new Error('ApophisCode image settings are not writable in this profile')
      const patch = {}
      if (Object.hasOwn(value, 'imageEnabled')) {
        if (typeof value.imageEnabled !== 'boolean') throw new Error('ApophisCode image switch must be a boolean')
        patch.imageEnabled = value.imageEnabled
      }
      if (Object.hasOwn(value, 'imageModel')) patch.imageModel = value.imageModel
      if (Object.hasOwn(value, 'imageQuality')) patch.imageQuality = value.imageQuality
      const next = { ...preference(), ...patch }
      validateImageQuality(next.imageQuality)
      if (patch.imageModel !== undefined && patch.imageModel !== '' && !(await availableModels()).some(row => row.id === patch.imageModel)) throw new Error('ApophisCode image model is absent from the active image key model list')
      if (next.imageModel !== '') validateImageOptions({ model: next.imageModel, quality: next.imageQuality })
      try { await writePreference(patch) } catch { throw new Error('ApophisCode could not save the image settings') }
      await reconcile()
      return status()
    },
    async mutate(operation, payload = {}) {
      const operations = {
        add: () => ring.add(payload.key, payload.label),
        rename: () => ring.rename(String(payload.id ?? ''), payload.label),
        remove: () => ring.remove(String(payload.id ?? '')),
        select: () => ring.select(String(payload.id ?? '')),
        enable: () => ring.enable(String(payload.id ?? '')),
      }
      if (!Object.hasOwn(operations, operation)) throw new Error('Unknown ApophisCode image key operation')
      await operations[operation]()
      invalidateModels()
      balance?.invalidate()
      await reconcile()
      return status()
    },
  }
}
