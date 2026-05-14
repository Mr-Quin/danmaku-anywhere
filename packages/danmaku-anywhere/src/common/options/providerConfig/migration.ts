import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import {
  builtInBilibiliProvider,
  builtInDanDanPlayProvider,
  builtInTencentProvider,
  defaultProviderConfigs,
} from './constant'
import type { ProviderConfig } from './schema'

// One-shot bridge from the legacy `danmakuSources` blob (extensionOptions
// pre-v21) to the new providerConfig array. Called from extensionOptions v21
// migration; idempotent because v21 only runs once on upgrade.
export function migrateDanmakuSourcesToProviders(
  // biome-ignore lint/suspicious/noExplicitAny: legacy input shape
  oldSources: any
): ProviderConfig[] {
  try {
    const providers: ProviderConfig[] = []

    try {
      if (oldSources.dandanplay) {
        providers.push({
          id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
          name: 'DanDanPlay',
          impl: DanmakuSourceType.DanDanPlay,
          enabled: oldSources.dandanplay.enabled ?? true,
          isBuiltIn: true,
          configValues: {
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
          id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
          name: 'Bilibili',
          impl: DanmakuSourceType.Bilibili,
          isBuiltIn: true,
          enabled: oldSources.bilibili.enabled ?? false,
          configValues: {
            danmakuFormat: oldSources.bilibili.danmakuTypePreference ?? 'xml',
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
          id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
          name: 'Tencent',
          impl: DanmakuSourceType.Tencent,
          isBuiltIn: true,
          enabled: oldSources.tencent.enabled ?? false,
          configValues: {},
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
        const baseUrl = oldSources.custom.baseUrl?.trim()
        const danmuicuBaseUrl = oldSources.custom.danmuicuBaseUrl?.trim()

        if (
          baseUrl &&
          danmuicuBaseUrl &&
          baseUrl !== '' &&
          danmuicuBaseUrl !== ''
        ) {
          providers.push({
            id: LEGACY_MACCMS_ID,
            manifestId: LEGACY_MACCMS_ID,
            name: 'MacCMS',
            impl: DanmakuSourceType.MacCMS,
            isBuiltIn: false,
            enabled: oldSources.custom.enabled ?? true,
            configValues: {
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

// Convert OLD discriminated-union providerConfig records to the flat shape.
// Records get to this point if the user ran extensionOptions v21 before the
// flat-shape refactor — they have configs stored under `options.X` with a
// `type` discriminator.
export function migrateProviderConfigsToFlat(
  // biome-ignore lint/suspicious/noExplicitAny: legacy input shape
  data: any[]
): ProviderConfig[] {
  const out: ProviderConfig[] = []
  for (const old of data) {
    // Already flat (idempotent re-run, or v2-shape record landed here somehow).
    if (typeof old.manifestId === 'string' && old.configValues) {
      out.push(old as ProviderConfig)
      continue
    }
    const base = {
      id: old.id as string,
      name: old.name as string,
      impl: old.impl as DanmakuSourceType,
      isBuiltIn: !!old.isBuiltIn,
      // Default to true if missing — old defaults had DDP enabled and
      // Bilibili/Tencent disabled, but treating absent fields as enabled
      // is less destructive than silently flipping a user's preference.
      enabled: old.enabled ?? true,
    }
    const options = old.options ?? {}
    switch (old.type) {
      case 'DanDanPlay':
        out.push({
          ...base,
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
          configValues: { chConvert: options.chConvert },
        })
        break
      case 'Bilibili':
        out.push({
          ...base,
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
          configValues: { danmakuFormat: options.danmakuTypePreference },
        })
        break
      case 'Tencent':
        out.push({
          ...base,
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
          configValues: {},
        })
        break
      case 'DanDanPlayCompatible':
        out.push({
          ...base,
          manifestId: 'builtin:ddp-compat',
          configValues: options,
        })
        break
      case 'MacCMS':
        out.push({
          ...base,
          manifestId: LEGACY_MACCMS_ID,
          configValues: options,
        })
        break
      default:
        console.warn(
          'Dropping corrupted provider config record during v1→v2 migration:',
          old
        )
      // Drop — no `manifestId` means we can't route it through the factory.
    }
  }
  return out
}
