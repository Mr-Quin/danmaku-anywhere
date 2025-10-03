import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  BuiltInTencentProvider,
  CustomDanDanPlayProvider,
  CustomMacCmsProvider,
  ProviderConfig,
} from './schema'

export const defaultBuiltInDanDanPlayProvider: BuiltInDanDanPlayProvider = {
  id: 'dandanplay',
  type: 'DanDanPlay',
  name: 'DanDanPlay',
  enabled: true,
  isBuiltIn: true,
  options: {
    chConvert: DanDanChConvert.None,
  },
}

export const defaultBuiltInBilibiliProvider: BuiltInBilibiliProvider = {
  id: 'bilibili',
  type: 'Bilibili',
  name: 'Bilibili',
  enabled: true,
  isBuiltIn: true,
  options: {
    danmakuTypePreference: 'xml',
    protobufLimitPerMin: 200,
  },
}

export const defaultBuiltInTencentProvider: BuiltInTencentProvider = {
  id: 'tencent',
  type: 'Tencent',
  name: 'Tencent',
  enabled: true,
  isBuiltIn: true,
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
    type: 'DanDanPlayCompatible',
    name: input.name ?? 'DanDanPlay Compatible',
    enabled: input.enabled ?? false,
    isBuiltIn: false,
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
    type: 'MacCMS',
    name: input.name ?? 'MacCMS',
    enabled: input.enabled ?? false,
    isBuiltIn: false,
    options: {
      danmakuBaseUrl: input.options?.danmakuBaseUrl ?? '',
      danmuicuBaseUrl: input.options?.danmuicuBaseUrl ?? '',
      stripColor: input.options?.stripColor ?? false,
    },
  }
}
