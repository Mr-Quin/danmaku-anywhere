import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { getRandomUUID } from '@/common/utils/utils'
import {
  defaultBuiltInBilibiliProvider,
  defaultBuiltInDanDanPlayProvider,
  defaultBuiltInTencentProvider,
} from './constant'
import type { ProviderConfig } from './schema'

/**
 * Migrate old danmakuSources format to new provider config list
 *
 * Migration rules:
 * 1. Built-in providers (dandanplay, bilibili, tencent) → Always create as built-in
 * 2. If dandanplay has custom baseUrl and useCustomRoot=true → Create additional custom-dandanplay provider
 * 3. custom source → Create custom-maccms provider
 * 4. iqiyi → Currently not supported, will be skipped
 */
export function migrateDanmakuSourcesToProviders(
  oldSources: DanmakuSources
): ProviderConfig[] {
  const providers: ProviderConfig[] = []

  // 1. Migrate built-in DanDanPlay provider
  if (oldSources.dandanplay) {
    providers.push({
      id: 'builtin-dandanplay',
      type: 'builtin-dandanplay',
      name: 'DanDanPlay',
      enabled: oldSources.dandanplay.enabled,
      options: {
        chConvert: oldSources.dandanplay.chConvert ?? DanDanChConvert.None,
      },
    })

    // If user has custom baseUrl and useCustomRoot is true, create a custom provider
    if (
      oldSources.dandanplay.useCustomRoot &&
      oldSources.dandanplay.baseUrl &&
      oldSources.dandanplay.baseUrl.trim() !== ''
    ) {
      // Only create custom provider if it's not the default DanDanPlay URL
      const isDefaultUrl =
        oldSources.dandanplay.baseUrl.includes('api.dandanplay.net') ||
        oldSources.dandanplay.baseUrl.includes('api.dandanplay.com')

      if (!isDefaultUrl) {
        providers.push({
          id: getRandomUUID(),
          type: 'custom-dandanplay',
          name: 'DanDanPlay Compatible (Migrated)',
          enabled: oldSources.dandanplay.enabled,
          options: {
            baseUrl: oldSources.dandanplay.baseUrl.trim(),
            chConvert: oldSources.dandanplay.chConvert ?? DanDanChConvert.None,
          },
        })
      }
    }
  } else {
    // No dandanplay in old config, use default
    providers.push(defaultBuiltInDanDanPlayProvider)
  }

  // 2. Migrate built-in Bilibili provider
  if (oldSources.bilibili) {
    providers.push({
      id: 'builtin-bilibili',
      type: 'builtin-bilibili',
      name: 'Bilibili',
      enabled: oldSources.bilibili.enabled,
      options: {
        danmakuTypePreference:
          oldSources.bilibili.danmakuTypePreference ?? 'xml',
        protobufLimitPerMin: oldSources.bilibili.protobufLimitPerMin ?? 200,
      },
    })
  } else {
    // No bilibili in old config, use default
    providers.push(defaultBuiltInBilibiliProvider)
  }

  // 3. Migrate built-in Tencent provider
  if (oldSources.tencent) {
    providers.push({
      id: 'builtin-tencent',
      type: 'builtin-tencent',
      name: 'Tencent',
      enabled: oldSources.tencent.enabled,
      options: {
        limitPerMin: oldSources.tencent.limitPerMin ?? 200,
      },
    })
  } else {
    // No tencent in old config, use default
    providers.push(defaultBuiltInTencentProvider)
  }

  // 4. Migrate custom MacCMS provider
  if (oldSources.custom) {
    // Check if custom source has valid URLs
    const hasValidUrls =
      oldSources.custom.baseUrl &&
      oldSources.custom.baseUrl.trim() !== '' &&
      oldSources.custom.danmuicuBaseUrl &&
      oldSources.custom.danmuicuBaseUrl.trim() !== ''

    if (hasValidUrls) {
      providers.push({
        id: getRandomUUID(),
        type: 'custom-maccms',
        name: 'MacCMS (Migrated)',
        enabled: oldSources.custom.enabled,
        options: {
          danmakuBaseUrl: oldSources.custom.baseUrl.trim(),
          danmuicuBaseUrl: oldSources.custom.danmuicuBaseUrl.trim(),
          stripColor: oldSources.custom.stripColor ?? false,
        },
      })
    }
  }

  // Note: iqiyi is not currently supported in the new system
  // We could log this for debugging purposes
  if (oldSources.iqiyi?.enabled) {
    console.warn(
      'iQiyi provider was enabled but is not supported in the new provider system'
    )
  }

  return providers
}

/**
 * Check if migration is needed by checking if danmakuSources exists in old format
 */
export function needsMigration(options: any): boolean {
  return (
    options &&
    typeof options === 'object' &&
    'danmakuSources' in options &&
    typeof options.danmakuSources === 'object' &&
    options.danmakuSources !== null
  )
}
