import {
  DanmakuSourceType,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { PROXY_DDP_BASE_URL } from './constant'
import type { ProviderConfig } from './schema'

// A source the extension ships preconfigured. Its config has the manifest's
// id as its own id, which season providerConfigId references depend on.
export interface BuiltinSource {
  manifestId: string
  configValues: Record<string, unknown>
  // Settings of the built-in config that a user edit cannot change
  lockedKeys: readonly string[]
}

export const BUILTIN_SOURCES: readonly BuiltinSource[] = [
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    configValues: {
      baseUrl: PROXY_DDP_BASE_URL,
      chConvert: DanDanChConvert.None,
    },
    // Seasons are keyed by the config that fetched them, so pointing the
    // built-in at another server would mix two catalogs under one id; another
    // server gets its own instance. The hosted proxy signs requests itself, so
    // the credential fields have nothing to do.
    lockedKeys: ['baseUrl', 'appId', 'appSecret', 'auth'],
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
    // The manifest defaults to protobuf, which would change the format for
    // users who never picked it.
    configValues: { danmakuFormat: 'xml' },
    lockedKeys: [],
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
    configValues: {},
    lockedKeys: [],
  },
]

// A user's own server can point at the hosted proxy URL too, so the built-in
// is told by its identity, never by its settings.
export function isBuiltinConfig(config: {
  id?: string
  manifestId: string
}): boolean {
  return config.id === config.manifestId
}

export function findBuiltinSource(
  manifestId: string
): BuiltinSource | undefined {
  return BUILTIN_SOURCES.find((source) => source.manifestId === manifestId)
}

export function lockedConfigKeys(config: {
  id?: string
  manifestId: string
}): ReadonlySet<string> {
  if (!isBuiltinConfig(config)) {
    return new Set()
  }
  return new Set(findBuiltinSource(config.manifestId)?.lockedKeys ?? [])
}

export function createBuiltinConfig(source: BuiltinSource): ProviderConfig {
  return {
    id: source.manifestId,
    manifestId: source.manifestId,
    customName: null,
    enabled: true,
    configValues: { ...source.configValues },
  }
}
