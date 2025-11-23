export enum DanmakuSourceType {
  MacCMS = 'Custom', // TODO: change this to not custom
  DanDanPlay = 'DanDanPlay',
  Bilibili = 'Bilibili',
  Tencent = 'Tencent',
  Custom = 'Custom',
}

export const LEGACY_MACCMS_ID = 'legacy:maccms'

export const PROVIDER_TO_BUILTIN_ID = {
  [DanmakuSourceType.DanDanPlay]: 'builtin:dandanplay',
  [DanmakuSourceType.Bilibili]: 'builtin:bilibili',
  [DanmakuSourceType.Tencent]: 'builtin:tencent',
  [DanmakuSourceType.MacCMS]: LEGACY_MACCMS_ID, // not built-in, but used for migrations
} as const satisfies Record<DanmakuSourceType, string>

export type RemoteDanmakuSourceType = Exclude<
  DanmakuSourceType,
  DanmakuSourceType.MacCMS
>

export type ByProvider<T, P extends DanmakuSourceType> = Extract<
  T,
  { provider: P }
>

export type BilibiliOf<T> = ByProvider<T, DanmakuSourceType.Bilibili>
export type DanDanPlayOf<T> = ByProvider<T, DanmakuSourceType.DanDanPlay>
export type TencentOf<T> = ByProvider<T, DanmakuSourceType.Tencent>
export type CustomOf<T> = ByProvider<T, DanmakuSourceType.MacCMS>

type DbEntityBase = Readonly<{
  // How many times the entity has been updated
  version: number
  // The last time the entity was updated
  timeUpdated: number
  // Auto generated id
  id: number
}>

export type DbEntity<T> = T & DbEntityBase
