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
          name: 'MacCMS',
          impl: DanmakuSourceType.MacCMS,
          isBuiltIn: false,
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

// Convert OLD discriminated-union providerConfig records to the flat shape.
// Records get to this point if the user ran extensionOptions v21 before the
// flat-shape refactor — they have configs stored under `options.X` with a
// `type` discriminator.
export function migrateProviderConfigsToFlat(
  // biome-ignore lint/suspicious/noExplicitAny: legacy input shape
  data: any[]
): ProviderConfig[] {
  if (!Array.isArray(data)) {
    console.error(
      'migrateProviderConfigsToFlat: input is not an array, returning empty:',
      data
    )
    return []
  }
  const out: ProviderConfig[] = []
  for (const old of data) {
    if (old === null || old === undefined || typeof old !== 'object') {
      console.warn('Skipping non-object provider record during migration:', old)
      continue
    }
    // Idempotent path for already-flat records; safeParse rejects partial corruption.
    if (
      typeof old.manifestId === 'string' &&
      typeof old.configValues === 'object' &&
      old.configValues !== null
    ) {
      const parsed = providerConfigSchema.safeParse(old)
      if (parsed.success) {
        out.push(parsed.data)
        continue
      }
      console.warn(
        'Dropping partially-flat provider record that fails schema:',
        old,
        parsed.error.issues
      )
      continue
    }
    const base = {
      id: old.id as string,
      name: old.name as string,
      impl: old.impl as DanmakuSourceType,
      isBuiltIn: !!old.isBuiltIn,
      // Default to visible when the field is missing.
      enabled: old.enabled ?? true,
    }
    const options = old.options ?? {}
    const inferredType =
      old.type ?? inferTypeFromImpl(old.impl as DanmakuSourceType | undefined)
    switch (inferredType) {
      case 'DanDanPlay':
        out.push({
          ...base,
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
          configValues: pruneUndefined({
            baseUrl: PROXY_DDP_BASE_URL,
            chConvert: options.chConvert,
          }),
        })
        break
      case 'Bilibili':
        out.push({
          ...base,
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
          configValues: pruneUndefined({
            danmakuFormat: options.danmakuTypePreference,
          }),
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
        // A custom DDP server folds onto the unified DanDanPlay manifest; its
        // options already carry the custom baseUrl/auth.
        out.push({
          ...base,
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
          configValues: pruneUndefined(options),
        })
        break
      case 'MacCMS':
        out.push({
          ...base,
          manifestId: LEGACY_MACCMS_ID,
          configValues: pruneUndefined(options),
        })
        break
      default:
        console.warn(
          'Dropping corrupted provider config record during v1→v2 migration (unrecognized type):',
          old
        )
    }
  }
  return out
}

function inferTypeFromImpl(
  impl: DanmakuSourceType | undefined
): string | undefined {
  if (impl === undefined) {
    return undefined
  }
  switch (impl) {
    case DanmakuSourceType.DanDanPlay:
      return 'DanDanPlay'
    case DanmakuSourceType.Bilibili:
      return 'Bilibili'
    case DanmakuSourceType.Tencent:
      return 'Tencent'
    case DanmakuSourceType.MacCMS:
      return 'MacCMS'
    default:
      return undefined
  }
}

// Strip the `builtin:` prefix from stored `id`/`manifestId`. Stripping `id`
// can collide a user's own built-in record with a default that an earlier
// migration appended; de-dupe by id keeping the user's record but merging in
// any configValues keys it lacks (e.g. a pinned default format). Corrupt
// records are skipped so one bad entry can't abort the whole migration.
export function migrateBuiltinPrefixedProviderIds(
  data: ProviderConfig[]
): ProviderConfig[] {
  const byId = new Map<string, ProviderConfig>()
  const order: string[] = []
  for (const config of data) {
    if (
      config === null ||
      typeof config !== 'object' ||
      typeof config.id !== 'string'
    ) {
      console.warn('Skipping invalid provider record during migration:', config)
      continue
    }
    const id = stripBuiltinPrefix(config.id)
    const manifestId =
      typeof config.manifestId === 'string'
        ? stripBuiltinPrefix(config.manifestId)
        : config.manifestId
    const existing = byId.get(id)
    if (existing) {
      existing.configValues = {
        ...config.configValues,
        ...existing.configValues,
      }
      continue
    }
    byId.set(id, { ...config, id, manifestId })
    order.push(id)
  }
  // biome-ignore lint/style/noNonNullAssertion: ids in `order` were just set
  return order.map((id) => byId.get(id)!)
}

const DDP_API_SUFFIX = /\/api\/?$/

// Custom DanDanPlay servers used to require the `/api` path in baseUrl; the
// manifest now appends `/api/v2/...` itself, so a stored `/api` suffix doubles
// the path. Strip a trailing `/api` from custom DanDanPlay configs.
export function migrateDanDanPlayApiBaseUrl(
  data: ProviderConfig[]
): ProviderConfig[] {
  const ddpManifestId = PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]
  return data.map((config) => {
    if (
      config === null ||
      typeof config !== 'object' ||
      config.isBuiltIn ||
      config.manifestId !== ddpManifestId
    ) {
      return config
    }
    const baseUrl = (config.configValues as { baseUrl?: unknown })?.baseUrl
    if (typeof baseUrl !== 'string' || !DDP_API_SUFFIX.test(baseUrl)) {
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

// Append any builtin whose id isn't already in the user's stored list.
// Idempotent: stored configs (with user choices like `enabled`,
// `configValues`) are preserved; only missing builtins get appended.
export function ensureBuiltinProviders(
  data: ProviderConfig[]
): ProviderConfig[] {
  const have = new Set(data.map((c) => c.id))
  const additions: ProviderConfig[] = []
  for (const builtin of defaultProviderConfigs) {
    if (!have.has(builtin.id)) {
      additions.push(builtin)
    }
  }
  return additions.length > 0 ? [...data, ...additions] : data
}
