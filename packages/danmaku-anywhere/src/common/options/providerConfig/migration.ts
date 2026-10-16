import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
  stripBuiltinPrefix,
} from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'
import { PROXY_DDP_BASE_URL } from './constant'
import type { ProviderConfig } from './schema'

// The record shape of versions 2 to 5, which the steps up to 5 read and write.
const providerConfigV5Schema = z.object({
  id: z.string(),
  manifestId: z.string(),
  name: z.string().min(1),
  enabled: z.boolean(),
  configValues: z.record(z.string(), z.unknown()),
})

export type ProviderConfigV5 = z.infer<typeof providerConfigV5Schema>

// The built-ins as releases before the manifest catalog stored them. Kept as
// literals so these steps do not change when today's built-ins do.
const builtInDanDanPlayProvider: ProviderConfigV5 = {
  id: 'dandanplay',
  manifestId: 'dandanplay',
  name: 'DanDanPlay',
  enabled: true,
  configValues: {
    baseUrl: PROXY_DDP_BASE_URL,
    chConvert: DanDanChConvert.None,
  },
}

const builtInBilibiliProvider: ProviderConfigV5 = {
  id: 'bilibili',
  manifestId: 'bilibili',
  name: 'Bilibili',
  enabled: true,
  configValues: { danmakuFormat: 'xml' },
}

const builtInTencentProvider: ProviderConfigV5 = {
  id: 'tencent',
  manifestId: 'tencent',
  name: 'Tencent',
  enabled: true,
  configValues: {},
}

export const legacyDefaultProviderConfigs: ProviderConfigV5[] = [
  builtInDanDanPlayProvider,
  builtInBilibiliProvider,
  builtInTencentProvider,
]

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
): ProviderConfigV5[] {
  try {
    const providers: ProviderConfigV5[] = []

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

    const macCms = runStep<ProviderConfigV5 | null>({
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
      return [...legacyDefaultProviderConfigs]
    }

    return providers
  } catch (error) {
    console.error(
      'Failed to migrate danmaku sources — falling back to defaults:',
      error
    )
    return [...legacyDefaultProviderConfigs]
  }
}

// Convert OLD discriminated-union providerConfig records to the flat shape.
// Records get to this point if the user ran extensionOptions v21 before the
// flat-shape refactor — they have configs stored under `options.X` with a
// `type` discriminator.
export function migrateProviderConfigsToFlat(
  // biome-ignore lint/suspicious/noExplicitAny: legacy input shape
  data: any[]
): ProviderConfigV5[] {
  if (!Array.isArray(data)) {
    throw new Error('Stored provider configs are not a list')
  }
  const out: ProviderConfigV5[] = []
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
      const parsed = providerConfigV5Schema.safeParse(old)
      if (parsed.success) {
        out.push(parsed.data)
        continue
      }
      throw new Error(
        `A stored provider config does not match the schema: ${parsed.error.message}`
      )
    }
    const base = {
      id: old.id as string,
      name: old.name as string,
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
      // v1.5.0 and earlier wrote only the five types above, so anything
      // else is damaged data.
      default:
        throw new Error(
          `A stored provider config has an unknown type: ${String(inferredType)}`
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
  data: ProviderConfigV5[]
): ProviderConfigV5[] {
  const byId = new Map<string, ProviderConfigV5>()
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
  data: ProviderConfigV5[]
): ProviderConfigV5[] {
  const ddpManifestId = PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]
  return data.map((config) => {
    if (
      config === null ||
      typeof config !== 'object' ||
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
  data: ProviderConfigV5[]
): ProviderConfigV5[] {
  const have = new Set(data.map((c) => c.id))
  const additions: ProviderConfigV5[] = []
  for (const builtin of legacyDefaultProviderConfigs) {
    if (!have.has(builtin.id)) {
      additions.push(builtin)
    }
  }
  return additions.length > 0 ? [...data, ...additions] : data
}

// The provider tag comes from manifestId, so `impl` and `isBuiltIn` are no
// longer read. Drop just those two keys rather than re-parsing through the
// schema, which keeps this migration independent of later schema changes.
export function migrateDropDeadProviderFields(
  data: ProviderConfigV5[]
): ProviderConfigV5[] {
  if (!Array.isArray(data)) {
    return data
  }
  return data.map((config) => {
    if (config === null || typeof config !== 'object') {
      return config
    }
    const { impl, isBuiltIn, ...rest } = config as ProviderConfigV5 & {
      impl?: unknown
      isBuiltIn?: unknown
    }
    return rest
  })
}

// The ids of the built-ins at version 6, and the settings of each that the
// extension owns and no longer stores.
const V6_BUILTIN_IDS = new Set(['dandanplay', 'bilibili', 'tencent'])
const V6_LOCKED_KEYS: Record<string, readonly string[]> = {
  dandanplay: ['baseUrl', 'appId', 'appSecret', 'auth'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function v6ConfigValues(
  id: string,
  isBuiltin: boolean,
  configValues: unknown
): Record<string, unknown> {
  const values = isRecord(configValues) ? configValues : {}
  if (!isBuiltin) {
    return values
  }
  const locked = new Set(V6_LOCKED_KEYS[id] ?? [])
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !locked.has(key))
  )
}

function hostOf(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  try {
    return new URL(value).host || undefined
  } catch {
    return undefined
  }
}

// Legacy MacCMS has no default name, so a blank one becomes its server host.
function v6CustomName(
  manifestId: string,
  name: unknown,
  configValues: Record<string, unknown>
): string | null {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (trimmed !== '') {
    return trimmed
  }
  if (manifestId !== LEGACY_MACCMS_ID) {
    return null
  }
  return hostOf(configValues.danmakuBaseUrl) ?? manifestId
}

// customName null means the source's default name. No released version let a
// user rename a built-in, so every built-in takes the default name and every
// other config keeps the name it has. A record that already has customName
// and no name was written at version 6 and only loses settings the extension
// owns, so a store an older build stamped with an older version survives.
export function migrateToCustomNames(
  data: ProviderConfigV5[]
): ProviderConfig[] {
  if (!Array.isArray(data)) {
    return []
  }
  return data.flatMap((record: unknown) => {
    if (
      !isRecord(record) ||
      typeof record.id !== 'string' ||
      typeof record.manifestId !== 'string'
    ) {
      return []
    }
    const { name, customName, ...rest } = record
    const isBuiltin =
      record.id === record.manifestId && V6_BUILTIN_IDS.has(record.id)
    const configValues = v6ConfigValues(
      record.id,
      isBuiltin,
      record.configValues
    )
    const migrated = { ...rest, configValues } as Omit<
      ProviderConfig,
      'customName'
    >
    if ('customName' in record && !('name' in record)) {
      return [{ ...migrated, customName: customName as string | null }]
    }
    return [
      {
        ...migrated,
        customName: isBuiltin
          ? null
          : v6CustomName(record.manifestId, name, configValues),
      },
    ]
  })
}
