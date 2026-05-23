export enum DanmakuSourceType {
  MacCMS = 'Custom', // TODO: change this to not custom
  DanDanPlay = 'DanDanPlay',
  Bilibili = 'Bilibili',
  Tencent = 'Tencent',
  Youku = 'Youku',
  Mango = 'Mango',
  Iqiyi = 'Iqiyi',
  Sohu = 'Sohu',
  Maiduidui = 'Maiduidui',
  Custom = 'Custom',
}

export const LEGACY_MACCMS_ID = 'legacy:maccms'

export const PROVIDER_TO_BUILTIN_ID = {
  [DanmakuSourceType.DanDanPlay]: 'builtin:dandanplay',
  [DanmakuSourceType.Bilibili]: 'builtin:bilibili',
  [DanmakuSourceType.Tencent]: 'builtin:tencent',
  [DanmakuSourceType.Youku]: 'builtin:youku',
  [DanmakuSourceType.Mango]: 'builtin:mango',
  [DanmakuSourceType.Iqiyi]: 'builtin:iqiyi',
  [DanmakuSourceType.Sohu]: 'builtin:sohu',
  [DanmakuSourceType.Maiduidui]: 'builtin:maiduidui',
  [DanmakuSourceType.MacCMS]: LEGACY_MACCMS_ID, // not built-in, but used for migrations to indicate this is a migrated option
} as const satisfies Record<DanmakuSourceType, string>

export type RemoteDanmakuSourceType = Exclude<
  DanmakuSourceType,
  DanmakuSourceType.MacCMS
>

type DbEntityBase = Readonly<{
  // How many times the entity has been updated
  version: number
  // The last time the entity was updated
  timeUpdated: number
  // Auto generated id
  id: number
}>

export type DbEntity<T> = T & DbEntityBase
