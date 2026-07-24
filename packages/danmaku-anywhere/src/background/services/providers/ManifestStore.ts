import { Mutex } from 'async-mutex'
import { injectable } from 'inversify'
import { ExtStorageService } from '@/common/storage/ExtStorageService'

// 'bundled' behaves like 'preinstalled' everywhere except getPendingUpdates
// (auto-upgrades on the next reachable sync instead of surfacing as a manual
// update) and applyUpdates (also eligible, so a direct call still replaces
// it). It marks a manifest seeded from the build-time bundle rather than
// fetched from the catalog; fetchAndStore always writes 'preinstalled', so
// the tag clears the moment the catalog copy replaces the entry.
export type ManifestKind = 'preinstalled' | 'user' | 'bundled'

export interface ManifestEntry {
  manifest: unknown
  kind: ManifestKind
}

export type ManifestRecord = Record<string, ManifestEntry>

export interface IManifestStore {
  getAll(): Promise<ManifestRecord>
  get(id: string): Promise<ManifestEntry | undefined>
  has(id: string): Promise<boolean>
  set(id: string, entry: ManifestEntry): Promise<void>
  setMany(entries: ManifestRecord): Promise<void>
  remove(id: string): Promise<void>
  getLastCheckedAt(): Promise<number | null>
  setLastCheckedAt(timestamp: number): Promise<void>
}

const STORAGE_KEY = 'manifests'
const LAST_CHECKED_KEY = 'manifestsLastChecked'

@injectable('Singleton')
export class ManifestStore implements IManifestStore {
  private storage = new ExtStorageService<ManifestRecord>(STORAGE_KEY, {
    storageType: 'local',
  })

  private lastChecked = new ExtStorageService<number>(LAST_CHECKED_KEY, {
    storageType: 'local',
  })

  // chrome.storage has no atomic read-modify-write, so concurrent writes can
  // clobber each other. Serialize them.
  private writeLock = new Mutex()

  async getAll(): Promise<ManifestRecord> {
    const record = await this.storage.read()
    return record ?? {}
  }

  async get(id: string): Promise<ManifestEntry | undefined> {
    const record = await this.getAll()
    return record[id]
  }

  async has(id: string): Promise<boolean> {
    const record = await this.getAll()
    return id in record
  }

  set(id: string, entry: ManifestEntry): Promise<void> {
    return this.setMany({ [id]: entry })
  }

  setMany(entries: ManifestRecord): Promise<void> {
    return this.writeLock.runExclusive(async () => {
      const record = await this.getAll()
      await this.storage.set({ ...record, ...entries })
    })
  }

  remove(id: string): Promise<void> {
    return this.writeLock.runExclusive(async () => {
      const record = await this.getAll()
      if (!(id in record)) {
        return
      }
      delete record[id]
      await this.storage.set(record)
    })
  }

  async getLastCheckedAt(): Promise<number | null> {
    return (await this.lastChecked.read()) ?? null
  }

  setLastCheckedAt(timestamp: number): Promise<void> {
    return this.lastChecked.set(timestamp)
  }
}
