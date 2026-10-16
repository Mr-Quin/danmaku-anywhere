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
  layoutItems,
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

  private get splittable(): boolean {
    return (this.layout.parts ?? []).length > 0
  }

  async read(): Promise<Options<T> | undefined> {
    const items = await this.readItems()
    return decodeEnvelope(this.layout, items) as Options<T> | undefined
  }

  async write(envelope: Options<T>): Promise<void> {
    const area = getStorageArea(this.location.area)
    const existing = this.splittable ? await this.readItems() : {}
    const items = encodeEnvelope(this.layout, envelope, existing)
    if (this.location.area === 'sync') {
      for (const [key, value] of Object.entries(items)) {
        if (storedItemBytes(key, value) > QUOTA_BYTES_PER_ITEM) {
          throw new OptionsStorageError('options.itemTooLarge', this.key)
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

  // A store that can be split is read with the whole area in one call: the
  // number of chunks is only known from the store's item, and a second call
  // could see another context's write.
  private async readItems(): Promise<Record<string, unknown>> {
    const area = getStorageArea(this.location.area)
    if (!this.splittable) {
      return area.get(this.key)
    }
    return layoutItems(this.layout, await area.get(null))
  }

  unwatchAll() {
    const area = getStorageArea(this.location.area)
    for (const watcher of this.watchers) {
      area.onChanged.removeListener(watcher)
    }
    this.watchers.clear()
  }
}
