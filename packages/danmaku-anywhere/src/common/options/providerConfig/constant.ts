import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import type { ProviderConfig } from './schema'

export const PROXY_DDP_BASE_URL = `${import.meta.env.VITE_PROXY_URL}/ddp`

export interface AutoImportProvider {
  manifestId: string
  impl: DanmakuSourceType
  configValues: Record<string, unknown>
}

export const AUTO_IMPORT_PROVIDERS: AutoImportProvider[] = [
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    impl: DanmakuSourceType.DanDanPlay,
    configValues: {
      baseUrl: PROXY_DDP_BASE_URL,
      chConvert: DanDanChConvert.None,
    },
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
    impl: DanmakuSourceType.Bilibili,
    // Pin xml; the manifest defaults to protobuf, which would change the format
    // for users who never picked it.
    configValues: {
      danmakuFormat: 'xml',
    },
  },
  {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
    impl: DanmakuSourceType.Tencent,
    configValues: {},
  },
]

// id equals manifestId; season providerConfigId references depend on it.
export function autoImportToProviderConfig(
  entry: AutoImportProvider,
  name: string
): ProviderConfig {
  return {
    id: entry.manifestId,
    manifestId: entry.manifestId,
    name,
    impl: entry.impl,
    enabled: true,
    configValues: { ...entry.configValues },
  }
}

export function createDefaultProviderConfig(
  manifestId: string,
  name: string
): ProviderConfig | undefined {
  const entry = AUTO_IMPORT_PROVIDERS.find((e) => e.manifestId === manifestId)
  return entry ? autoImportToProviderConfig(entry, name) : undefined
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
