import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { getRandomUUID } from '@/common/utils/utils'
import {
  builtInBilibiliProvider,
  builtInDanDanPlayProvider,
  builtInTencentProvider,
  defaultProviderConfigs,
} from './constant'
import type { ProviderConfig } from './schema'

export function migrateDanmakuSourcesToProviders(
  oldSources: any
): ProviderConfig[] {
  try {
    const providers: ProviderConfig[] = []

    try {
      if (oldSources.dandanplay) {
        providers.push({
          id: 'dandanplay',
          type: 'DanDanPlay',
          name: 'DanDanPlay',
          impl: DanmakuSourceType.DanDanPlay,
          enabled: oldSources.dandanplay.enabled ?? true,
          isBuiltIn: true,
          options: {
            chConvert: oldSources.dandanplay.chConvert ?? DanDanChConvert.None,
          },
        })
      } else {
        providers.push(builtInDanDanPlayProvider)
      }
    } catch (error) {
      console.error('Failed to migrate DanDanPlay provider:', error)
      providers.push(builtInDanDanPlayProvider)
    }

    try {
      if (oldSources.bilibili) {
        providers.push({
          id: 'bilibili',
          type: 'Bilibili',
          name: 'Bilibili',
          impl: DanmakuSourceType.Bilibili,
          isBuiltIn: true,
          enabled: oldSources.bilibili.enabled ?? true,
          options: {
            danmakuTypePreference:
              oldSources.bilibili.danmakuTypePreference ?? 'xml',
            // Note: protobufLimitPerMin is obsolete and ignored
          },
        })
      } else {
        providers.push(builtInBilibiliProvider)
      }
    } catch (error) {
      console.error('Failed to migrate Bilibili provider:', error)
      providers.push(builtInBilibiliProvider)
    }

    try {
      if (oldSources.tencent) {
        providers.push({
          id: 'tencent',
          type: 'Tencent',
          name: 'Tencent',
          impl: DanmakuSourceType.Tencent,
          isBuiltIn: true,
          enabled: oldSources.tencent.enabled ?? true,
          options: {
            // Note: limitPerMin is obsolete and ignored
          },
        })
      } else {
        providers.push(builtInTencentProvider)
      }
    } catch (error) {
      console.error('Failed to migrate Tencent provider:', error)
      providers.push(builtInTencentProvider)
    }

    try {
      if (oldSources.custom) {
        // Check if custom source has valid URLs
        const baseUrl = oldSources.custom.baseUrl?.trim()
        const danmuicuBaseUrl = oldSources.custom.danmuicuBaseUrl?.trim()

        if (
          baseUrl &&
          danmuicuBaseUrl &&
          baseUrl !== '' &&
          danmuicuBaseUrl !== ''
        ) {
          providers.push({
            id: getRandomUUID(),
            type: 'MacCMS',
            name: 'MacCMS (Migrated)',
            impl: DanmakuSourceType.MacCMS,
            isBuiltIn: false,
            enabled: oldSources.custom.enabled ?? true,
            options: {
              danmakuBaseUrl: baseUrl,
              danmuicuBaseUrl: danmuicuBaseUrl,
              stripColor: oldSources.custom.stripColor ?? false,
            },
          })
        }
      }
    } catch (error) {
      console.error('Failed to migrate custom MacCMS provider:', error)
    }

    if (providers.length === 0) {
      return [...defaultProviderConfigs]
    }

    return providers
  } catch (error) {
    console.error('Failed to migrate danmaku sources:', error)
    return [...defaultProviderConfigs]
  }
}
