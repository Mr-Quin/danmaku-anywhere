export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

// Every store's data keyed by store key, read before any store is migrated
export type StoreSnapshot = Record<string, unknown>

export type DeferredWrite = () => Promise<void>

export interface UpgradeContext {
  stores: StoreSnapshot
  // Steps stay pure: a write to another store is handed back here and only
  // runs once the migrated result of this store is accepted.
  defer: (write: DeferredWrite) => void
}

// biome-ignore lint/suspicious/noExplicitAny: used for data migration where the previous options type is lost
export type PrevOptions = any

export interface Version {
  version: number
  upgrade: (prevSchema: PrevOptions, context: UpgradeContext) => unknown
}

export type VersionConfig = Omit<Version, 'version'>
