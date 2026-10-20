/** Profile preferences for the models advertised in ApophisCode's picker. */
import { fieldValue } from './preferences.js'

/** Store exclusions so new catalog models are selected by default as well. */
export function readHiddenModels(preference) {
  const value = fieldValue(preference?.hiddenModels)
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(id => typeof id === 'string' && id !== ''))].sort()
}

export function createModelSelectionController({ readPreference, writePreference, isWritable, onChange, availableModelIds }) {
  const hidden = () => readHiddenModels(readPreference())
  let directoryIds
  const visibleSignature = () => JSON.stringify(hidden().filter(id => directoryIds === undefined || directoryIds.has(id)))
  let advertised = visibleSignature()

  const reconcile = () => {
    const next = visibleSignature()
    if (next === advertised) return
    onChange?.()
    advertised = next
  }

  const project = covered => {
    directoryIds = new Set(covered ?? [])
    advertised = visibleSignature()
    const excluded = new Set(hidden())
    return {
      writable: isWritable() === true,
      models: [...directoryIds].map(id => {
        return { id, name: id, selected: !excluded.has(id) }
      }),
    }
  }
  const status = () => availableModelIds === undefined ? project() : availableModelIds().then(project)

  return Object.freeze({
    status,
    reconcile,
    refresh: () => onChange?.(),
    isVisible: id => !hidden().includes(id),
    async update({ selectedIds } = {}) {
      const currentIds = availableModelIds === undefined ? new Set() : await availableModelIds()
      if (!Array.isArray(selectedIds) || selectedIds.some(id => !currentIds.has(id))) {
        throw new Error('That ApophisCode model selection is not supported')
      }
      if (isWritable() !== true) throw new Error('ApophisCode settings are not writable in this profile')
      const selected = new Set(selectedIds)
      directoryIds = new Set(currentIds)
      try {
        await writePreference({ hiddenModels: [...hidden().filter(id => !currentIds.has(id)), ...[...currentIds].filter(id => !selected.has(id))] })
      } catch {
        throw new Error('ApophisCode could not save the model selection')
      }
      reconcile()
      return status()
    },
  })
}
