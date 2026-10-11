export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

// Every store's data keyed by store key, read before any store is migrated
export type StoreSnapshot = Record<string, unknown>

export interface DeferredWrite {
  // Key of the store the write targets
  store: string
  run: () => Promise<void>
}

export interface UpgradeContext {
  stores: StoreSnapshot
  // A write to another store, run before this store's data is persisted
  defer: (write: DeferredWrite) => void
}

// biome-ignore lint/suspicious/noExplicitAny: used for data migration where the previous options type is lost
export type PrevOptions = any

export interface Version {
  version: number
  upgrade: (prevSchema: PrevOptions, context: UpgradeContext) => unknown
}

export type VersionConfig = Omit<Version, 'version'>
