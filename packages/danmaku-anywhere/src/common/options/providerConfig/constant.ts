import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import type { ProviderConfig } from './schema'

export const PROXY_DDP_BASE_URL = `${import.meta.env.VITE_PROXY_URL}/ddp`

// The preloaded set, kept lean: identity (manifestId) plus the few config
// overrides that differ from the manifest's own defaults. The display name is
// resolved from the manifest at seed time so it localizes; `fallbackName` only
// applies where no manifest is available (legacy migrations, offline reset).
export interface AutoImportProvider {
  manifestId: string
  impl: DanmakuSourceType
  fallbackName: string
  enabled: boolean
  configValues: Record<string, unknown>
}

export const AUTO_IMPORT_PROVIDERS: AutoImportProvider[] = [
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    impl: DanmakuSourceType.DanDanPlay,
    fallbackName: 'DanDanPlay',
    enabled: true,
    configValues: {
      baseUrl: PROXY_DDP_BASE_URL,
      chConvert: DanDanChConvert.None,
    },
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
    impl: DanmakuSourceType.Bilibili,
    fallbackName: 'Bilibili',
    enabled: true,
    // Pin xml explicitly so the user-visible default matches master. The
    // manifest defaults to protobuf, which is the better long-term endpoint
    // but would silently switch the format for existing users on upgrade.
    configValues: {
      danmakuFormat: 'xml',
    },
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
    impl: DanmakuSourceType.Tencent,
    fallbackName: 'Tencent',
    enabled: true,
    configValues: {},
  },
]

// Built-in instances key their config id to the manifest id; season
// providerConfigId references depend on this equality.
export function autoImportToProviderConfig(
  entry: AutoImportProvider,
  name: string
): ProviderConfig {
  return {
    id: entry.manifestId,
    manifestId: entry.manifestId,
    name,
    impl: entry.impl,
    enabled: entry.enabled,
    configValues: { ...entry.configValues },
  }
}

// Full configs carrying the hardcoded fallback names. Used only where no
// manifest is available: legacy-data migrations for existing users and the
// offline reset fallback. Fresh installs seed from the manifest instead so the
// preloaded names localize (see ProviderService.seedDefaultProviders).
export const defaultProviderConfigs: ProviderConfig[] =
  AUTO_IMPORT_PROVIDERS.map((entry) =>
    autoImportToProviderConfig(entry, entry.fallbackName)
  )

export const builtInDanDanPlayProvider = defaultProviderConfigs[0]
export const builtInBilibiliProvider = defaultProviderConfigs[1]
export const builtInTencentProvider = defaultProviderConfigs[2]

export function createDefaultProviderConfig(
  manifestId: string,
  name?: string
): ProviderConfig | undefined {
  const entry = AUTO_IMPORT_PROVIDERS.find((e) => e.manifestId === manifestId)
  if (!entry) {
    return undefined
  }
  return autoImportToProviderConfig(entry, name ?? entry.fallbackName)
}

export function createCustomDanDanPlayProvider(
  input: Partial<ProviderConfig> = {}
): ProviderConfig {
  const inputValues = (input.configValues ?? {}) as {
    baseUrl?: string
    auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
  }
  return {
    id: input.id ?? getRandomUUID(),
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    name: input.name ?? 'DanDanPlay',
    impl: DanmakuSourceType.DanDanPlay,
    enabled: true,
    configValues: {
      baseUrl: inputValues.baseUrl ?? '',
      auth: {
        enabled: inputValues.auth?.enabled ?? false,
        headers: inputValues.auth?.headers ?? [],
      },
    },
  }
}

export function createCustomMacCmsProvider(
  input: Partial<ProviderConfig> = {}
): ProviderConfig {
  const inputValues = (input.configValues ?? {}) as {
    danmakuBaseUrl?: string
    danmuicuBaseUrl?: string
    stripColor?: boolean
  }
  return {
    id: input.id ?? getRandomUUID(),
    manifestId: LEGACY_MACCMS_ID,
    name: input.name ?? 'MacCMS',
    impl: DanmakuSourceType.MacCMS,
    enabled: true,
    configValues: {
      danmakuBaseUrl: inputValues.danmakuBaseUrl ?? '',
      danmuicuBaseUrl: inputValues.danmuicuBaseUrl ?? '',
      stripColor: inputValues.stripColor ?? false,
    },
  }
}
