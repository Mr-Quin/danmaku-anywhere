export enum DanmakuSourceType {
  MacCMS = 'Custom',
  DanDanPlay = 'DanDanPlay',
  Bilibili = 'Bilibili',
  Tencent = 'Tencent',
}

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
