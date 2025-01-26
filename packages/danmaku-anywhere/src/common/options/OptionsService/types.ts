export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

export interface Version {
  version: number
  upgrade: (prevSchema: unknown) => unknown // previous schema's type is unknown
}

export type VersionConfig = Omit<Version, 'version'>
