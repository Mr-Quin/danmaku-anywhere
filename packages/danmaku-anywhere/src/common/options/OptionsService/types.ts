export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

export type UpgradeContext = Record<string, unknown>

// biome-ignore lint/suspicious/noExplicitAny: used for data migration where the previous options type is lost
export type PrevOptions = any

export interface Version {
  version: number
  upgrade: (prevSchema: PrevOptions, context: UpgradeContext) => unknown
}

export type VersionConfig = Omit<Version, 'version'>
