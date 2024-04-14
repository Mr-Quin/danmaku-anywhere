import { invariant, tryCatch } from '../utils/utils'

import { Logger } from './Logger'

type ExtStorageType = 'local' | 'sync' | 'session'

export interface ExtStorageServiceOptions {
  storageType?: ExtStorageType
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
    private options: ExtStorageServiceOptions
  ) {
    this.storage = chrome.storage[options.storageType ?? 'local']

    this.#listenToStorageChanges()
  }

  async read() {
    const [data, err] = await tryCatch(() => this.storage.get(this.key))

    if (err) {
      Logger.error(err)
      return
    }

    if (this.key === null || Array.isArray(this.key)) return data as T
    return data[this.key] as T
  }

  async set(value: T) {
    invariant(
      typeof this.key === 'string',
      'Key must be a string when setting value'
    )

    const [res, err] = await tryCatch(() =>
      this.storage.set({ [this.key as string]: value })
    )

    if (err) {
      Logger.error(err)
      return
    }

    this.#notifyListeners(value)

    return res
  }

  async delete() {
    invariant(
      this.key !== null,
      'Key cannot be null when deleting value, you must explicitly call clearStorage()'
    )

    const [res, err] = await tryCatch(() =>
      this.storage.remove(this.key as string | string[])
    )

    if (err) {
      Logger.error(err)
      return
    }

    this.#notifyListeners(undefined)

    return res
  }

  async clearStorage() {
    const [res, err] = await tryCatch(() => this.storage.clear())

    if (err) {
      Logger.error(err)
      return
    }

    this.#notifyListeners(undefined)

    return res
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
        this.#notifyListeners(change.newValue)
      }
    }

    this.listener = listener

    this.storage.onChanged.addListener(listener)
  }
}
