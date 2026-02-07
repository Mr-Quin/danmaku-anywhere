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
    async get(keys?: string | string[] | null) {
      if (keys === null || keys === undefined) {
        return Object.fromEntries(store.entries())
      }
      if (Array.isArray(keys)) {
        return keys.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = store.get(key)
          return acc
        }, {})
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
    onChanged: {
      addListener(listener: StorageChangeListener) {
        listeners.add(listener)
      },
      removeListener(listener: StorageChangeListener) {
        listeners.delete(listener)
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
