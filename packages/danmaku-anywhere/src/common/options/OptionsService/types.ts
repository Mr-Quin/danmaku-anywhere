export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

export type UpgradeContext = Record<string, unknown>

/**
 * `initialized` means there was nothing stored and defaults were written.
 * `reset` means migration failed and the stored data was replaced with
 * defaults, so whatever was there is gone.
 */
export type UpgradeOutcome = 'upgraded' | 'initialized' | 'reset'

// biome-ignore lint/suspicious/noExplicitAny: used for data migration where the previous options type is lost
export type PrevOptions = any

export interface Version {
  version: number
  upgrade: (prevSchema: PrevOptions, context: UpgradeContext) => unknown
}

export type VersionConfig = Omit<Version, 'version'>
