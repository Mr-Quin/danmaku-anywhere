type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>
) => void

type StorageAreaLike = chrome.storage.StorageArea & {
  onChanged: {
    addListener: (listener: StorageChangeListener) => void
    removeListener: (listener: StorageChangeListener) => void
  }
}

const standaloneStorageAreas = new Map<string, StorageAreaLike>()

const createStandaloneStorageArea = (): StorageAreaLike => {
  const store = new Map<string, unknown>()
  const listeners = new Set<StorageChangeListener>()

  const emitChanges = (
    changes: Record<string, chrome.storage.StorageChange>
  ) => {
    if (Object.keys(changes).length === 0) return
    listeners.forEach((listener) => listener(changes))
  }

  return {
    // biome-ignore lint/suspicious/noExplicitAny: match chrome signature
    async get(keys?: any) {
      if (keys === null || keys === undefined) {
        return Object.fromEntries(store.entries())
      }
      if (Array.isArray(keys)) {
        return keys.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = store.get(key)
          return acc
        }, {})
      }
      if (typeof keys === 'object') {
        const result: Record<string, unknown> = {}
        for (const [key, defaultValue] of Object.entries(keys)) {
          const value = store.get(key)
          result[key] = value === undefined ? defaultValue : value
        }
        return result
      }
      return { [keys]: store.get(keys) }
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, chrome.storage.StorageChange> = {}
      Object.entries(items).forEach(([key, value]) => {
        const oldValue = store.get(key)
        store.set(key, value)
        changes[key] = { oldValue, newValue: value }
      })
      emitChanges(changes)
    },
    // biome-ignore lint/suspicious/noExplicitAny: match chrome signature
    async getBytesInUse(keys?: any) {
      return 0
    },
    async remove(keys: string | string[]) {
      const keysToRemove = Array.isArray(keys) ? keys : [keys]
      const changes: Record<string, chrome.storage.StorageChange> = {}
      keysToRemove.forEach((key) => {
        if (store.has(key)) {
          const oldValue = store.get(key)
          store.delete(key)
          changes[key] = { oldValue, newValue: undefined }
        }
      })
      emitChanges(changes)
    },
    async clear() {
      const changes: Record<string, chrome.storage.StorageChange> = {}
      store.forEach((value, key) => {
        changes[key] = { oldValue: value, newValue: undefined }
      })
      store.clear()
      emitChanges(changes)
    },
    async setAccessLevel(accessOptions: {
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    }) {
      /* no-op */
    },
    async getKeys() {
      return Array.from(store.keys())
    },
    onChanged: {
      addListener(listener: StorageChangeListener) {
        listeners.add(listener)
      },
      removeListener(listener: StorageChangeListener) {
        listeners.delete(listener)
      },
      hasListener(listener: StorageChangeListener) {
        return listeners.has(listener)
      },
      hasListeners() {
        return listeners.size > 0
      },
      addRules: () => {
        /* no-op */
      },
      getRules: () => {
        /* no-op */
      },
      removeRules: () => {
        /* no-op */
      },
    },
  } satisfies StorageAreaLike
}

export const getStandaloneStorageArea = (type: string): StorageAreaLike => {
  const existing = standaloneStorageAreas.get(type)
  if (existing) return existing
  const created = createStandaloneStorageArea()
  standaloneStorageAreas.set(type, created)
  return created
}
