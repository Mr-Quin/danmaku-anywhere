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
  // What a new built-in config starts with; the user can change these
  configValues: Record<string, unknown>
  // Settings the extension owns. They are never stored: writes drop them and
  // the provider gets lockedValues for them, unset when not listed there.
  lockedKeys: readonly string[]
  lockedValues: Record<string, unknown>
}

export const BUILTIN_SOURCES: readonly BuiltinSource[] = [
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    configValues: { chConvert: DanDanChConvert.None },
    // Seasons are keyed by the config that fetched them, so pointing the
    // built-in at another server would mix two catalogs under one id; another
    // server gets its own instance. The hosted proxy signs requests itself, so
    // the credential fields have nothing to do.
    lockedKeys: ['baseUrl', 'appId', 'appSecret', 'auth'],
    lockedValues: { baseUrl: PROXY_DDP_BASE_URL },
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
    // The manifest defaults to protobuf, which would change the format for
    // users who never picked it.
    configValues: { danmakuFormat: 'xml' },
    lockedKeys: [],
    lockedValues: {},
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
    configValues: {},
    lockedKeys: [],
    lockedValues: {},
  },
]

type ConfigIdentity = { id?: string; manifestId: string }

// A user's own server can point at the hosted proxy URL too, so the built-in
// is told by its identity, never by its settings.
export function isBuiltinConfig(config: ConfigIdentity): boolean {
  return config.id === config.manifestId
}

export function findBuiltinSource(
  manifestId: string
): BuiltinSource | undefined {
  return BUILTIN_SOURCES.find((source) => source.manifestId === manifestId)
}

function builtinSourceOf(config: ConfigIdentity): BuiltinSource | undefined {
  return isBuiltinConfig(config)
    ? findBuiltinSource(config.manifestId)
    : undefined
}

export function lockedConfigKeys(config: ConfigIdentity): ReadonlySet<string> {
  return new Set(builtinSourceOf(config)?.lockedKeys ?? [])
}

export function withoutLockedValues<
  T extends ConfigIdentity & { configValues: Record<string, unknown> },
>(config: T): T {
  const locked = lockedConfigKeys(config)
  if (!Object.keys(config.configValues).some((key) => locked.has(key))) {
    return config
  }
  const configValues = Object.fromEntries(
    Object.entries(config.configValues).filter(([key]) => !locked.has(key))
  )
  return { ...config, configValues }
}

export function effectiveConfigValues(
  config: ConfigIdentity & { configValues: Record<string, unknown> }
): Record<string, unknown> {
  const source = builtinSourceOf(config)
  if (!source) {
    return config.configValues
  }
  return {
    ...withoutLockedValues(config).configValues,
    ...source.lockedValues,
  }
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
