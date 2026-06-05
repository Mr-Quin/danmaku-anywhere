import { Mutex } from 'async-mutex'
import { injectable } from 'inversify'
import { ExtStorageService } from '@/common/storage/ExtStorageService'

export type ManifestKind = 'preinstalled' | 'user'

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
}

const STORAGE_KEY = 'manifests'

@injectable('Singleton')
export class ManifestStore implements IManifestStore {
  private storage = new ExtStorageService<ManifestRecord>(STORAGE_KEY, {
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
    return this.writeLock.runExclusive(async () => {
      const record = await this.getAll()
      await this.storage.set({ ...record, [id]: entry })
    })
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
      const next = Object.fromEntries(
        Object.entries(record).filter(([key]) => key !== id)
      )
      await this.storage.set(next)
    })
  }
}
