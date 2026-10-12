import { getStorageArea } from '@/common/storage/getStorageArea'
import { invariant } from '../utils/utils'

export interface ExtStorageServiceOptions {
  storageType?: 'local' | 'sync' | 'session'
}

type ExtStorageServiceListener<T> = (value: T | undefined) => void

type StorageAreaListener = (
  changes: Record<string, chrome.storage.StorageChange>
) => void

export class ExtStorageService<T> {
  private listeners = new Set<ExtStorageServiceListener<T>>()
  private storage: chrome.storage.StorageArea
  private listener?: StorageAreaListener

  constructor(
    private key: string | string[] | null,
    options: ExtStorageServiceOptions
  ) {
    this.storage = getStorageArea(options.storageType ?? 'local')
  }

  setup() {
    this.#listenToStorageChanges()
  }

  async read(): Promise<T | undefined> {
    const data = await this.storage.get(this.key)

    if (this.key === null || Array.isArray(this.key)) {
      return data as T
    }
    return data[this.key] as T | undefined
  }

  async set(value: T): Promise<void> {
    invariant(
      typeof this.key === 'string',
      'Key must be a string when setting value'
    )

    await this.storage.set({ [this.key]: value })

    this.#notifyListeners(value)
  }

  async delete(): Promise<void> {
    invariant(
      this.key !== null,
      'Key cannot be null when deleting value, you must explicitly call clearStorage()'
    )

    await this.storage.remove(this.key)

    this.#notifyListeners(undefined)
  }

  async clearStorage(): Promise<void> {
    await this.storage.clear()

    this.#notifyListeners(undefined)
  }

  subscribe(listener: ExtStorageServiceListener<T>) {
    this.listeners.add(listener)
  }

  unsubscribe(listener: ExtStorageServiceListener<T>) {
    this.listeners.delete(listener)
  }

  destroy() {
    if (this.listener) {
      this.storage.onChanged.removeListener(this.listener)
    }
    this.listeners.clear()
  }

  #notifyListeners(value: T | undefined) {
    invariant(
      typeof this.key === 'string',
      'Key must be a string when notifying listeners'
    )
    this.listeners.forEach((listener) => listener(value))
  }

  #listenToStorageChanges() {
    // listen to storage change from elsewhere and update state
    if (typeof this.key !== 'string') return

    const listener: StorageAreaListener = async (changes) => {
      const change = changes[this.key as string]

      if (change) {
        this.#notifyListeners(change.newValue as T | undefined)
      }
    }

    this.listener = listener

    this.storage.onChanged.addListener(listener)
  }
}
