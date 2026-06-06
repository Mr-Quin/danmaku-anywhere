import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import type { ProviderConfig } from './schema'

export const PROXY_DDP_BASE_URL = `${import.meta.env.VITE_PROXY_URL}/ddp`

export const builtInDanDanPlayProvider: ProviderConfig = {
  id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  name: 'DanDanPlay',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: true,
  configValues: {
    baseUrl: PROXY_DDP_BASE_URL,
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
