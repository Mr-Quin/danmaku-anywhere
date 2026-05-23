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
  // Empty so the manifest's configSchema is the single source of truth for defaults.
  configValues: {},
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

export const builtInYoukuProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Youku],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Youku],
  name: 'Youku',
  impl: DanmakuSourceType.Youku,
  enabled: true,
  isBuiltIn: true,
  configValues: {},
}

export const builtInMangoProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Mango],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Mango],
  name: 'Mango TV',
  impl: DanmakuSourceType.Mango,
  enabled: true,
  isBuiltIn: true,
  configValues: {},
}

export const builtInIqiyiProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Iqiyi],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Iqiyi],
  name: 'iQIYI',
  impl: DanmakuSourceType.Iqiyi,
  enabled: true,
  isBuiltIn: true,
  configValues: {},
}

export const builtInSohuProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Sohu],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Sohu],
  name: 'Sohu',
  impl: DanmakuSourceType.Sohu,
  enabled: true,
  isBuiltIn: true,
  configValues: {},
}

export const defaultProviderConfigs: ProviderConfig[] = [
  builtInDanDanPlayProvider,
  builtInBilibiliProvider,
  builtInTencentProvider,
  builtInYoukuProvider,
  builtInMangoProvider,
  builtInIqiyiProvider,
  builtInSohuProvider,
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
