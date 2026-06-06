import type { ConfigSchema } from '@mr-quin/dango'
import { DanmakuSourceType } from '@/common/danmaku/enums'
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
    isBuiltIn: false,
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
