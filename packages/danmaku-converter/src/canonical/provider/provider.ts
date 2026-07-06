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

const BUILTIN_ID_TO_PROVIDER: Record<string, DanmakuSourceType> = {
  dandanplay: DanmakuSourceType.DanDanPlay,
  bilibili: DanmakuSourceType.Bilibili,
  tencent: DanmakuSourceType.Tencent,
  [LEGACY_MACCMS_ID]: DanmakuSourceType.MacCMS,
}

// A generic catalog manifest must not fall back to the Custom tag, which would
// make the source read as custom danmaku; DanDanPlay is the neutral default.
export function providerTypeFromManifestId(
  manifestId: string
): DanmakuSourceType {
  return BUILTIN_ID_TO_PROVIDER[manifestId] ?? DanmakuSourceType.DanDanPlay
}

const BUILTIN_ID_PREFIX = 'builtin:'

// Strip the `builtin:` id prefix. Ids without it (e.g. legacy:maccms) are
// returned unchanged.
export function stripBuiltinPrefix(id: string): string {
  return id.startsWith(BUILTIN_ID_PREFIX)
    ? id.slice(BUILTIN_ID_PREFIX.length)
    : id
}

// legacy:maccms appears in PROVIDER_TO_BUILTIN_ID for config-migration mapping
// but is not a real manifest, so it is not a built-in season identity.
const BUILTIN_MANIFEST_IDS = new Set<string>(
  Object.values(PROVIDER_TO_BUILTIN_ID).filter((id) => id !== LEGACY_MACCMS_ID)
)

// A built-in config id is itself the manifest id (minus any builtin: prefix). A
// custom id keys off a baseUrl that isn't on the id, so it can't be recovered.
export function resolveBuiltinManifestId(
  providerConfigId: string | undefined | null
): string | undefined {
  if (typeof providerConfigId !== 'string') {
    return undefined
  }
  const bareId = stripBuiltinPrefix(providerConfigId)
  return BUILTIN_MANIFEST_IDS.has(bareId) ? bareId : undefined
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
