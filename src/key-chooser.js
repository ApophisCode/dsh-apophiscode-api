/** Active-key snapshots and classified key failure rotation; no model-based key substitution. */
export function createKeyChooser({ ring, onRotated, logger }) {
  /**
   * Key material to ring id. A failure is reported from inside a stream, which
   * carries the request's key but not its id; this index is refreshed on every
   * resolution so the right key is the one that moves aside.
   */
  const idByKey = new Map()
  const remember = async () => {
    const entries = await ring.secrets()
    idByKey.clear()
    for (const entry of entries) idByKey.set(entry.key, entry.id)
  }
  /** The active key, with an index for classifying this request's failures. */
  const active = async () => {
    await remember()
    const key = await ring.activeKey()
    return key
  }

  return Object.freeze({
    remember,
    active,

    /** The ring id of the key material a request carries, as of the last resolution. */
    idOf: key => (typeof key === 'string' ? idByKey.get(key) : undefined),

    /**
     * The gateway exhausted or rejected a key: mark it unusable so the ring
     * moves on, then let the caller drop what depended on it.
     * @param kind - `quota` or `invalid-key`.
     * @param _message - the failure text (unused; the kind decides).
     * @param key - the key material the failed request carried.
     * @param knownId - the key's ring id, when the caller has it.
     */
    onKeyFailure(kind, _message, key, knownId) {
      const id = knownId ?? (key === undefined ? undefined : idByKey.get(key))
      if (id === undefined) {
        logger?.warn?.('apophiscode-api: %s reported for an unidentified key; not rotating', kind)
        return
      }
      logger?.warn?.('apophiscode-api: %s on key %s; the next key serves the retry', kind, id)
      void ring.disable(id, kind)
        .then(() => onRotated?.())
        .catch(error => logger?.warn?.('apophiscode-api: could not move past key %s: %s', id, error.message))
    },
  })
}
