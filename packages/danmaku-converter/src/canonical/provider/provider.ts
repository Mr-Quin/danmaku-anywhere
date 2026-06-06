export enum DanmakuSourceType {
  MacCMS = 'Custom', // TODO: change this to not custom
  DanDanPlay = 'DanDanPlay',
  Bilibili = 'Bilibili',
  Tencent = 'Tencent',
  Custom = 'Custom',
}

export const LEGACY_MACCMS_ID = 'legacy:maccms'

export const PROVIDER_TO_BUILTIN_ID = {
  [DanmakuSourceType.DanDanPlay]: 'dandanplay',
  [DanmakuSourceType.Bilibili]: 'bilibili',
  [DanmakuSourceType.Tencent]: 'tencent',
  [DanmakuSourceType.MacCMS]: LEGACY_MACCMS_ID, // not built-in, but used for migrations to indicate this is a migrated option
} as const satisfies Record<DanmakuSourceType, string>

const BUILTIN_ID_PREFIX = 'builtin:'

// Strip the `builtin:` id prefix. Ids without it (e.g. legacy:maccms) are
// returned unchanged.
export function stripBuiltinPrefix(id: string): string {
  return id.startsWith(BUILTIN_ID_PREFIX)
    ? id.slice(BUILTIN_ID_PREFIX.length)
    : id
}

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
