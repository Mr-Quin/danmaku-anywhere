import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import type { ProviderConfig } from './schema'

export const DDP_COMPAT_MANIFEST_ID = 'builtin:ddp-compat'

export const builtInDanDanPlayProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  name: 'DanDanPlay',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: true,
  configValues: {
    chConvert: DanDanChConvert.None,
  },
}

export const builtInBilibiliProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
  name: 'Bilibili',
  impl: DanmakuSourceType.Bilibili,
  enabled: true,
  isBuiltIn: true,
  // Pin xml explicitly so the user-visible default matches master. The
  // manifest defaults to protobuf, which is the better long-term endpoint
  // but would silently switch the format for existing users on upgrade.
  configValues: {
    danmakuFormat: 'xml',
  },
}

export const builtInTencentProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
  name: 'Tencent',
  impl: DanmakuSourceType.Tencent,
  enabled: true,
  isBuiltIn: true,
  configValues: {},
}

export const defaultProviderConfigs: ProviderConfig[] = [
  builtInDanDanPlayProvider,
  builtInBilibiliProvider,
  builtInTencentProvider,
]

export function createCustomDanDanPlayProvider(
  input: Partial<ProviderConfig> = {}
): ProviderConfig {
  const inputValues = (input.configValues ?? {}) as {
    baseUrl?: string
    auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
  }
  return {
    id: input.id ?? getRandomUUID(),
    manifestId: DDP_COMPAT_MANIFEST_ID,
    name: input.name ?? 'DanDanPlay',
    impl: DanmakuSourceType.DanDanPlay,
    enabled: true,
    isBuiltIn: false,
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
    isBuiltIn: false,
    configValues: {
      danmakuBaseUrl: inputValues.danmakuBaseUrl ?? '',
      danmuicuBaseUrl: inputValues.danmuicuBaseUrl ?? '',
      stripColor: inputValues.stripColor ?? false,
    },
  }
}
