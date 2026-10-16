import {
  type ExtStorageType,
  getStorageArea,
} from '@/common/storage/getStorageArea'
import {
  QUOTA_BYTES_PER_ITEM,
  storedItemBytes,
} from '@/common/storage/syncQuota'
import {
  classifyStorageFailure,
  OptionsStorageError,
} from './OptionsStorageError'
import {
  decodeEnvelope,
  encodeEnvelope,
  isLayoutKey,
  layoutKeys,
  referencedKeys,
  type StoreLayout,
} from './storeLayout'
import type { Options } from './types'

type StorageChanges = Record<string, chrome.storage.StorageChange>

export interface OptionsStorageLocation extends StoreLayout {
  readonly area: ExtStorageType
}

// Reads and writes one option store's envelope, whatever items its layout
// spreads it over. Storage quota failures reject with OptionsStorageError.
export class OptionsStorage<T> {
  private readonly layout: StoreLayout
  private readonly watchers = new Set<(changes: StorageChanges) => void>()

  constructor(private readonly location: OptionsStorageLocation) {
    this.layout = { key: location.key, parts: location.parts }
  }

  get key(): string {
    return this.location.key
  }

  async read(): Promise<Options<T> | undefined> {
    const area = getStorageArea(this.location.area)
    const keys = layoutKeys(this.layout)
    const items = await area.get(keys)
    const unread = referencedKeys(this.layout, items).filter((key) => {
      return !keys.includes(key)
    })
    if (unread.length > 0) {
      Object.assign(items, await area.get(unread))
    }
    return decodeEnvelope(this.layout, items) as Options<T> | undefined
  }

  async write(envelope: Options<T>): Promise<void> {
    const area = getStorageArea(this.location.area)
    const existing =
      (this.layout.parts ?? []).length > 0
        ? await area.get(layoutKeys(this.layout))
        : {}
    const items = encodeEnvelope(this.layout, envelope, existing)
    if (this.location.area === 'sync') {
      for (const [key, value] of Object.entries(items)) {
        if (storedItemBytes(key, value) > QUOTA_BYTES_PER_ITEM) {
          throw new OptionsStorageError('itemTooLarge', this.key)
        }
      }
    }
    try {
      await area.set(items)
    } catch (error) {
      const problem = classifyStorageFailure(error)
      if (problem) {
        throw new OptionsStorageError(problem, this.key, { cause: error })
      }
      throw error
    }
  }

  // Calls the listener with the stored envelope after any write to the
  // store, from this context or another one.
  watch(listener: (envelope: Options<T> | undefined) => void): () => void {
    const area = getStorageArea(this.location.area)
    const onChanged = (changes: StorageChanges) => {
      const touched = Object.keys(changes).some((key) => {
        return isLayoutKey(this.layout, key)
      })
      if (!touched) {
        return
      }
      void this.read().then(listener, () => undefined)
    }
    area.onChanged.addListener(onChanged)
    this.watchers.add(onChanged)
    return () => {
      area.onChanged.removeListener(onChanged)
      this.watchers.delete(onChanged)
    }
  }

  unwatchAll() {
    const area = getStorageArea(this.location.area)
    for (const watcher of this.watchers) {
      area.onChanged.removeListener(watcher)
    }
    this.watchers.clear()
  }
}
