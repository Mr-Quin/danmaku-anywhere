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

export class ManifestStore implements IManifestStore {
  private storage = new ExtStorageService<ManifestRecord>(STORAGE_KEY, {
    storageType: 'local',
  })

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

  async set(id: string, entry: ManifestEntry): Promise<void> {
    const record = await this.getAll()
    record[id] = entry
    await this.storage.set(record)
  }

  async setMany(entries: ManifestRecord): Promise<void> {
    const record = await this.getAll()
    await this.storage.set({ ...record, ...entries })
  }

  async remove(id: string): Promise<void> {
    const record = await this.getAll()
    if (!(id in record)) {
      return
    }
    delete record[id]
    await this.storage.set(record)
  }
}
