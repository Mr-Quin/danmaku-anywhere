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
const STORAGE_PREFIX = 'danmaku-anywhere:storage:'

const createStandaloneStorageArea = (areaName: string): StorageAreaLike => {
  const listeners = new Set<StorageChangeListener>()

  const getNamespacedKey = (key: string) =>
    `${STORAGE_PREFIX}${areaName}:${key}`

  const getStorageValue = (key: string): unknown => {
    if (typeof localStorage === 'undefined') return undefined
    try {
      const value = localStorage.getItem(getNamespacedKey(key))
      return value === null ? undefined : JSON.parse(value)
    } catch {
      return undefined
    }
  }

  const setStorageValue = (key: string, value: unknown) => {
    if (typeof localStorage === 'undefined') return
    if (value === undefined) {
      localStorage.removeItem(getNamespacedKey(key))
      return
    }
    localStorage.setItem(getNamespacedKey(key), JSON.stringify(value))
  }

  const removeStorageValue = (key: string) => {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(getNamespacedKey(key))
  }

  const getStorageKeys = (): string[] => {
    if (typeof localStorage === 'undefined') return []
    const prefix = `${STORAGE_PREFIX}${areaName}:`
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        keys.push(key.slice(prefix.length))
      }
    }
    return keys
  }

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
        const result: Record<string, unknown> = {}
        const allKeys = getStorageKeys()
        for (const key of allKeys) {
          result[key] = getStorageValue(key)
        }
        return result
      }
      if (Array.isArray(keys)) {
        return keys.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = getStorageValue(key)
          return acc
        }, {})
      }
      if (typeof keys === 'object') {
        const result: Record<string, unknown> = {}
        for (const [key, defaultValue] of Object.entries(keys)) {
          const value = getStorageValue(key)
          result[key] = value === undefined ? defaultValue : value
        }
        return result
      }
      return { [keys]: getStorageValue(keys) }
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, chrome.storage.StorageChange> = {}
      Object.entries(items).forEach(([key, value]) => {
        const oldValue = getStorageValue(key)
        setStorageValue(key, value)
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
        const oldValue = getStorageValue(key)
        if (oldValue !== undefined) {
          removeStorageValue(key)
          changes[key] = { oldValue, newValue: undefined }
        }
      })
      emitChanges(changes)
    },
    async clear() {
      const changes: Record<string, chrome.storage.StorageChange> = {}
      const allKeys = getStorageKeys()
      for (const key of allKeys) {
        const oldValue = getStorageValue(key)
        changes[key] = { oldValue, newValue: undefined }
        removeStorageValue(key)
      }
      emitChanges(changes)
    },
    async setAccessLevel(accessOptions: {
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    }) {
      /* no-op */
    },
    async getKeys() {
      return getStorageKeys()
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
  const created = createStandaloneStorageArea(type)
  standaloneStorageAreas.set(type, created)
  return created
}
