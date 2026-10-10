import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
  stripBuiltinPrefix,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import {
  AUTO_IMPORT_PROVIDERS,
  autoImportToProviderConfig,
  PROXY_DDP_BASE_URL,
} from './constant'
import { type ProviderConfig, providerConfigSchema } from './schema'

// Names for built-ins migrated from storage older than the manifest catalog.
// Fresh installs take the name from the manifest instead (see ProviderService).
const LEGACY_BUILTIN_NAMES: Record<string, string> = {
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]]: 'DanDanPlay',
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]]: 'Bilibili',
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]]: 'Tencent',
}

export const defaultProviderConfigs: ProviderConfig[] =
  AUTO_IMPORT_PROVIDERS.map((entry) =>
    autoImportToProviderConfig(entry, LEGACY_BUILTIN_NAMES[entry.manifestId])
  )

const [
  builtInDanDanPlayProvider,
  builtInBilibiliProvider,
  builtInTencentProvider,
] = defaultProviderConfigs

// Drop undefined-valued keys so manifest configSchema defaults can apply.
function pruneUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v
    }
  }
  return out
}

interface MigrationStep<T> {
  label: string
  build: () => T
  fallback: T
}

function runStep<T>(step: MigrationStep<T>): T {
  try {
    return step.build()
  } catch (error) {
    console.error(`Failed to migrate ${step.label}:`, error)
    return step.fallback
  }
}

// One-shot bridge from the legacy `danmakuSources` blob (extensionOptions
// pre-v21) to the new providerConfig array. Called from extensionOptions v21
// migration; idempotent because v21 only runs once on upgrade.
export function migrateDanmakuSourcesToProviders(
  // biome-ignore lint/suspicious/noExplicitAny: legacy input shape
  oldSources: any
): ProviderConfig[] {
  try {
    const providers: ProviderConfig[] = []

    providers.push(
      runStep({
        label: 'DanDanPlay provider',
        fallback: builtInDanDanPlayProvider,
        build: () => {
          if (!oldSources.dandanplay) {
            return builtInDanDanPlayProvider
          }
          return {
            ...builtInDanDanPlayProvider,
            enabled: oldSources.dandanplay.enabled ?? true,
            configValues: pruneUndefined({
              baseUrl: PROXY_DDP_BASE_URL,
              chConvert:
                oldSources.dandanplay.chConvert ?? DanDanChConvert.None,
            }),
          }
        },
      })
    )

    providers.push(
      runStep({
        label: 'Bilibili provider',
        fallback: builtInBilibiliProvider,
        build: () => {
          if (!oldSources.bilibili) {
            return builtInBilibiliProvider
          }
          return {
            ...builtInBilibiliProvider,
            enabled: oldSources.bilibili.enabled ?? false,
            configValues: pruneUndefined({
              danmakuFormat: oldSources.bilibili.danmakuTypePreference,
            }),
          }
        },
      })
    )

    providers.push(
      runStep({
        label: 'Tencent provider',
        fallback: builtInTencentProvider,
        build: () => {
          if (!oldSources.tencent) {
            return builtInTencentProvider
          }
          return {
            ...builtInTencentProvider,
            enabled: oldSources.tencent.enabled ?? false,
            configValues: {},
          }
        },
      })
    )

    const macCms = runStep<ProviderConfig | null>({
      label: 'custom MacCMS provider',
      fallback: null,
      build: () => {
        if (!oldSources.custom) {
          return null
        }
        const baseUrl = oldSources.custom.baseUrl?.trim()
        const danmuicuBaseUrl = oldSources.custom.danmuicuBaseUrl?.trim()
        if (
          !baseUrl ||
          !danmuicuBaseUrl ||
          baseUrl === '' ||
          danmuicuBaseUrl === ''
        ) {
          return null
        }
        return {
          id: LEGACY_MACCMS_ID,
          manifestId: LEGACY_MACCMS_ID,
          name: 'VOD',
          enabled: oldSources.custom.enabled ?? true,
          configValues: pruneUndefined({
            danmakuBaseUrl: baseUrl,
            danmuicuBaseUrl: danmuicuBaseUrl,
            stripColor: oldSources.custom.stripColor ?? false,
          }),
        }
      },
    })
    if (macCms !== null) {
      providers.push(macCms)
    }

    if (providers.length === 0) {
      return [...defaultProviderConfigs]
    }

    return providers
  } catch (error) {
    console.error(
      'Failed to migrate danmaku sources — falling back to defaults:',
      error
    )
    return [...defaultProviderConfigs]
  }
}

// v1.5.0 stored a union keyed by `type` with per-type `options`. Each record is
// translated on its own and dropped if the result does not parse, so one bad
// entry costs only itself.
export function migrateProviderConfigsToFlat(
  data: unknown[]
): ProviderConfig[] {
  const out: ProviderConfig[] = []
  for (const record of data) {
    const parsed = providerConfigSchema.safeParse(toFlatProviderConfig(record))
    if (parsed.success) {
      out.push(parsed.data)
    } else {
      console.warn(
        'Dropping provider config record that does not migrate:',
        record,
        parsed.error.issues
      )
    }
  }
  return out
}

// biome-ignore lint/suspicious/noExplicitAny: legacy input shape
function toFlatProviderConfig(old: any): unknown {
  if (old === null || typeof old !== 'object') {
    return old
  }
  if (typeof old.manifestId === 'string') {
    return old
  }
  const base = {
    id: old.id,
    name: old.name,
    enabled: old.enabled ?? true,
  }
  const options = old.options ?? {}
  switch (old.type) {
    case 'DanDanPlay':
      return {
        ...base,
        manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
        configValues: pruneUndefined({
          baseUrl: PROXY_DDP_BASE_URL,
          chConvert: options.chConvert,
        }),
      }
    case 'Bilibili':
      return {
        ...base,
        manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
        configValues: pruneUndefined({
          danmakuFormat: options.danmakuTypePreference,
        }),
      }
    case 'Tencent':
      return {
        ...base,
        manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
        configValues: {},
      }
    case 'DanDanPlayCompatible':
      // A custom DDP server folds onto the unified DanDanPlay manifest; its
      // options already carry the custom baseUrl/auth.
      return {
        ...base,
        manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
        configValues: pruneUndefined(options),
      }
    case 'MacCMS':
      return {
        ...base,
        manifestId: LEGACY_MACCMS_ID,
        configValues: pruneUndefined(options),
      }
    default:
      return undefined
  }
}

export function migrateBuiltinPrefixedProviderIds(
  data: ProviderConfig[]
): ProviderConfig[] {
  return data.map((config) => {
    return {
      ...config,
      id: stripBuiltinPrefix(config.id),
      manifestId: stripBuiltinPrefix(config.manifestId),
    }
  })
}

const DDP_API_SUFFIX = /\/api\/?$/

// Custom DanDanPlay servers used to require the `/api` path in baseUrl; the
// manifest now appends `/api/v2/...` itself, so a stored `/api` suffix doubles
// the path.
export function migrateDanDanPlayApiBaseUrl(
  data: ProviderConfig[]
): ProviderConfig[] {
  const ddpManifestId = PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]
  return data.map((config) => {
    const baseUrl = config.configValues.baseUrl
    if (
      config.manifestId !== ddpManifestId ||
      typeof baseUrl !== 'string' ||
      !DDP_API_SUFFIX.test(baseUrl)
    ) {
      return config
    }
    return {
      ...config,
      configValues: {
        ...config.configValues,
        baseUrl: baseUrl.replace(DDP_API_SUFFIX, ''),
      },
    }
  })
}
