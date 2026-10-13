import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfigDraft } from './schema'

export const PROXY_DDP_BASE_URL = `${import.meta.env.VITE_PROXY_URL}/ddp`

export function createCustomDanDanPlayDraft(
  customName: string
): ProviderConfigDraft {
  return {
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    customName,
    enabled: true,
    configValues: {
      baseUrl: '',
      auth: { enabled: false, headers: [] },
    },
  }
}

export function createCustomMacCmsDraft(): ProviderConfigDraft {
  return {
    manifestId: LEGACY_MACCMS_ID,
    customName: 'VOD',
    enabled: true,
    configValues: {
      danmakuBaseUrl: '',
      danmuicuBaseUrl: '',
      stripColor: false,
    },
  }
}
