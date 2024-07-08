export type OptionsSchema = Record<string, any>

export interface Options<T> {
  data: T
  version: number
}

export interface Version<T> {
  version: number
  upgrade: (prevSchema: unknown) => T // previous schema's type is unknown
}

export type VersionConfig<T> = Omit<Version<T>, 'version'>
