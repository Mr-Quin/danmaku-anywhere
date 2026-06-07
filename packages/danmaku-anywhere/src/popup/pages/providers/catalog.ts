import { PROVIDER_TO_BUILTIN_ID } from '@danmaku-anywhere/danmaku-converter'
import type { ConfigSchema } from '@mr-quin/dango'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { getRandomUUID } from '@/common/utils/utils'
import {
  buildDefaultValues,
  getObjectFields,
} from './components/forms/schemaForm'

// Imported catalog sources are resolved by manifestId, so impl is a
// non-load-bearing tag. DanDanPlay is the least-broken choice: it sits in the
// default type filter and gets the refresh affordance. It must not be Custom,
// which the provider factory rejects for non-maccms configs.
export function createConfigFromManifest(
  manifest: ProviderManifestInfo
): ProviderConfig {
  return {
    id: getRandomUUID(),
    manifestId: manifest.id,
    name: manifest.name,
    impl: DanmakuSourceType.DanDanPlay,
    enabled: true,
    configValues: buildDefaultValues(manifest.configSchema, {}),
  }
}

// A required field without a default can't be satisfied by the schema alone,
// so the user has to fill it in before the config is usable.
export function manifestNeedsConfigForm(configSchema?: ConfigSchema): boolean {
  return getObjectFields(configSchema).some(
    (field) => field.required && field.schema.default === undefined
  )
}

// No manifest field declares multi-instance support yet, so the one source
// that takes several configs (the DanDanPlay-compatible servers, including the
// hosted proxy) is hardcoded. Replace with a manifest capability when one lands.
const DDP_MANIFEST_ID = PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]
const MULTI_INSTANCE_MANIFEST_IDS = new Set<string>([DDP_MANIFEST_ID])

export function supportsInstances(manifestId: string): boolean {
  return MULTI_INSTANCE_MANIFEST_IDS.has(manifestId)
}

// The DanDanPlay instance pointed at our hosted proxy, as opposed to a
// user-added server.
export function isHostedDanDanPlay(config: ProviderConfig): boolean {
  return (
    config.manifestId === DDP_MANIFEST_ID &&
    config.configValues.baseUrl === PROXY_DDP_BASE_URL
  )
}

export type InstalledUnit =
  | { type: 'single'; id: string; config: ProviderConfig }
  | { type: 'group'; id: string; manifestId: string; configs: ProviderConfig[] }

// A multi-instance manifest always renders as a group (collapsible), even with
// a single config, so the Add instance affordance is always reachable. The
// group is anchored at the first member's position so drag-order (search
// priority) is per-manifest.
export function groupInstalled(configs: ProviderConfig[]): InstalledUnit[] {
  const units: InstalledUnit[] = []
  const grouped = new Set<string>()
  for (const config of configs) {
    if (!supportsInstances(config.manifestId)) {
      units.push({ type: 'single', id: config.id, config })
      continue
    }
    if (grouped.has(config.manifestId)) {
      continue
    }
    grouped.add(config.manifestId)
    units.push({
      type: 'group',
      id: `group:${config.manifestId}`,
      manifestId: config.manifestId,
      configs: configs.filter((c) => c.manifestId === config.manifestId),
    })
  }
  return units
}

// Flatten a reordered unit list back to the persisted config order, keeping each
// group's instances in their existing relative order.
export function flattenUnits(units: InstalledUnit[]): ProviderConfig[] {
  return units.flatMap((unit) =>
    unit.type === 'single' ? [unit.config] : unit.configs
  )
}

export function matchesQuery(query: string, ...fields: string[]): boolean {
  const trimmed = query.trim().toLowerCase()
  if (trimmed === '') {
    return true
  }
  return fields.some((field) => field.toLowerCase().includes(trimmed))
}

export type CheckedAgo =
  | { unit: 'never' }
  | { unit: 'justNow' }
  | { unit: 'minutes' | 'hours' | 'days'; count: number }

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function checkedAgo(
  lastCheckedAt: number | null,
  now: number
): CheckedAgo {
  if (lastCheckedAt === null) {
    return { unit: 'never' }
  }
  const elapsed = Math.max(0, now - lastCheckedAt)
  if (elapsed < MINUTE) {
    return { unit: 'justNow' }
  }
  if (elapsed < HOUR) {
    return { unit: 'minutes', count: Math.floor(elapsed / MINUTE) }
  }
  if (elapsed < DAY) {
    return { unit: 'hours', count: Math.floor(elapsed / HOUR) }
  }
  return { unit: 'days', count: Math.floor(elapsed / DAY) }
}
