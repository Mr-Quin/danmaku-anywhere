export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

export type UpgradeContext = Record<string, unknown>

export interface Version {
  version: number
  upgrade: (prevSchema: unknown, context: UpgradeContext) => unknown // previous schema's type is unknown
}

export type VersionConfig = Omit<Version, 'version'>
