export type StorageItems = Record<string, unknown>
export type StorageKeys = string | string[] | StorageItems | null | undefined
export type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>
) => void

export interface FakeStorageArea {
  get(keys?: StorageKeys): Promise<StorageItems>
  get(keys: StorageKeys, callback: (items: StorageItems) => void): void
  set(items: StorageItems): Promise<void>
  remove(keys: string | string[]): Promise<void>
  clear(): Promise<void>
  onChanged: {
    addListener(listener: StorageChangeListener): void
    removeListener(listener: StorageChangeListener): void
    hasListener(listener: StorageChangeListener): boolean
  }
}

export interface FakeChromeStorage {
  local: FakeStorageArea
  sync: FakeStorageArea
  session: FakeStorageArea
  reset(): void
}

interface ResettableFakeStorageArea extends FakeStorageArea {
  reset(): void
}

// Real chrome.storage serializes values, so a caller can never observe or
// mutate the object the extension stored. Cloning keeps aliasing bugs visible.
function copy<T>(value: T): T {
  return structuredClone(value)
}

function createFakeStorageArea(): ResettableFakeStorageArea {
  const values = new Map<string, unknown>()
  const listeners = new Set<StorageChangeListener>()

  function emit(changes: Record<string, chrome.storage.StorageChange>) {
    if (Object.keys(changes).length === 0) {
      return
    }

    for (const listener of listeners) {
      listener(changes)
    }
  }

  function getValues(keys: StorageKeys): StorageItems {
    if (keys === null || keys === undefined) {
      return copy(Object.fromEntries(values))
    }

    if (typeof keys === 'string') {
      return values.has(keys) ? { [keys]: copy(values.get(keys)) } : {}
    }

    if (Array.isArray(keys)) {
      const items: StorageItems = {}
      for (const key of keys) {
        if (values.has(key)) {
          items[key] = copy(values.get(key))
        }
      }
      return items
    }

    const items: StorageItems = {}
    for (const [key, defaultValue] of Object.entries(keys)) {
      items[key] = values.has(key) ? copy(values.get(key)) : copy(defaultValue)
    }
    return items
  }

  function get(keys?: StorageKeys): Promise<StorageItems>
  function get(keys: StorageKeys, callback: (items: StorageItems) => void): void
  function get(
    keys: StorageKeys = undefined,
    callback?: (items: StorageItems) => void
  ): Promise<StorageItems> | void {
    const items = getValues(keys)
    if (callback) {
      callback(items)
      return
    }

    return Promise.resolve(items)
  }

  async function set(items: StorageItems): Promise<void> {
    const changes: Record<string, chrome.storage.StorageChange> = {}
    for (const [key, newValue] of Object.entries(items)) {
      const oldValue = values.get(key)
      values.set(key, copy(newValue))
      changes[key] = { oldValue: copy(oldValue), newValue: copy(newValue) }
    }
    emit(changes)
  }

  async function remove(keys: string | string[]): Promise<void> {
    const keysToRemove = Array.isArray(keys) ? keys : [keys]
    const changes: Record<string, chrome.storage.StorageChange> = {}
    for (const key of keysToRemove) {
      if (!values.has(key)) {
        continue
      }

      const oldValue = copy(values.get(key))
      values.delete(key)
      changes[key] = { oldValue, newValue: undefined }
    }
    emit(changes)
  }

  async function clear(): Promise<void> {
    const changes: Record<string, chrome.storage.StorageChange> = {}
    for (const [key, oldValue] of values) {
      changes[key] = { oldValue: copy(oldValue), newValue: undefined }
    }
    values.clear()
    emit(changes)
  }

  return {
    get,
    set,
    remove,
    clear,
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
    },
    reset() {
      values.clear()
      listeners.clear()
    },
  }
}

export function createFakeChromeStorage(): FakeChromeStorage {
  const local = createFakeStorageArea()
  const sync = createFakeStorageArea()
  const session = createFakeStorageArea()

  return {
    local,
    sync,
    session,
    reset() {
      local.reset()
      sync.reset()
      session.reset()
    },
  }
}
