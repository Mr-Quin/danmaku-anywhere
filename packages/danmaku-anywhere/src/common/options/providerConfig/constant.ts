import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  BuiltInTencentProvider,
  CustomDanDanPlayProvider,
  CustomMacCmsProvider,
  ProviderConfig,
} from './schema'
import { getRandomUUID } from '@/common/utils/utils'

export const defaultBuiltInDanDanPlayProvider: BuiltInDanDanPlayProvider = {
  id: 'builtin-dandanplay',
  type: 'builtin-dandanplay',
  name: 'DanDanPlay',
  enabled: true,
  options: {
    chConvert: DanDanChConvert.None,
  },
}

export const defaultBuiltInBilibiliProvider: BuiltInBilibiliProvider = {
  id: 'builtin-bilibili',
  type: 'builtin-bilibili',
  name: 'Bilibili',
  enabled: true,
  options: {
    danmakuTypePreference: 'xml',
    protobufLimitPerMin: 200,
  },
}

export const defaultBuiltInTencentProvider: BuiltInTencentProvider = {
  id: 'builtin-tencent',
  type: 'builtin-tencent',
  name: 'Tencent',
  enabled: true,
  options: {
    limitPerMin: 200,
  },
}

export const defaultProviderConfigs: ProviderConfig[] = [
  defaultBuiltInDanDanPlayProvider,
  defaultBuiltInBilibiliProvider,
  defaultBuiltInTencentProvider,
]

export const createCustomDanDanPlayProvider = (
  input: Partial<CustomDanDanPlayProvider> = {}
): CustomDanDanPlayProvider => {
  return {
    id: input.id ?? getRandomUUID(),
    type: 'custom-dandanplay',
    name: input.name ?? 'DanDanPlay Compatible',
    enabled: input.enabled ?? false,
    options: {
      baseUrl: input.options?.baseUrl ?? '',
      chConvert: input.options?.chConvert ?? DanDanChConvert.None,
    },
  }
}

export const createCustomMacCmsProvider = (
  input: Partial<CustomMacCmsProvider> = {}
): CustomMacCmsProvider => {
  return {
    id: input.id ?? getRandomUUID(),
    type: 'custom-maccms',
    name: input.name ?? 'MacCMS',
    enabled: input.enabled ?? false,
    options: {
      danmakuBaseUrl: input.options?.danmakuBaseUrl ?? '',
      danmuicuBaseUrl: input.options?.danmuicuBaseUrl ?? '',
      stripColor: input.options?.stripColor ?? false,
    },
  }
}
