import {
  DanmakuSourceType,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  BuiltInTencentProvider,
  CustomMacCmsProvider,
  DanDanPlayCompatProvider,
  ProviderConfig,
} from './schema'

export const builtInDanDanPlayProvider: BuiltInDanDanPlayProvider = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  type: 'DanDanPlay',
  name: 'DanDanPlay',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: true,
  options: {
    chConvert: DanDanChConvert.None,
  },
}

export const builtInBilibiliProvider: BuiltInBilibiliProvider = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
  type: 'Bilibili',
  name: 'Bilibili',
  impl: DanmakuSourceType.Bilibili,
  enabled: true,
  isBuiltIn: true,
  options: {
    danmakuTypePreference: 'xml',
  },
}

export const builtInTencentProvider: BuiltInTencentProvider = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
  type: 'Tencent',
  name: 'Tencent',
  impl: DanmakuSourceType.Tencent,
  enabled: true,
  isBuiltIn: true,
  options: {},
}

export const defaultProviderConfigs: ProviderConfig[] = [
  builtInDanDanPlayProvider,
  builtInBilibiliProvider,
  builtInTencentProvider,
]

export const createCustomDanDanPlayProvider = (
  input: Partial<DanDanPlayCompatProvider> = {}
): DanDanPlayCompatProvider => {
  return {
    id: input.id ?? getRandomUUID(),
    type: 'DanDanPlayCompatible',
    name: input.name ?? 'DanDanPlay',
    impl: DanmakuSourceType.DanDanPlay,
    enabled: true,
    isBuiltIn: false,
    options: {
      baseUrl: input.options?.baseUrl ?? '',
      auth: {
        enabled: input.options?.auth?.enabled ?? false,
        headers: input.options?.auth?.headers ?? [],
      },
    },
  }
}

export const createCustomMacCmsProvider = (
  input: Partial<CustomMacCmsProvider> = {}
): CustomMacCmsProvider => {
  return {
    id: input.id ?? getRandomUUID(),
    type: 'MacCMS',
    name: input.name ?? 'MacCMS',
    impl: DanmakuSourceType.MacCMS,
    enabled: true,
    isBuiltIn: false,
    options: {
      danmakuBaseUrl: input.options?.danmakuBaseUrl ?? '',
      danmuicuBaseUrl: input.options?.danmuicuBaseUrl ?? '',
      stripColor: input.options?.stripColor ?? false,
    },
  }
}
