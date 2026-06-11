import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { computeNamespaceKey } from './namespaceKey'

export function resolveSeasonConfig(
  season: { manifestId?: string; namespaceKey?: string },
  configs: ProviderConfig[]
): ProviderConfig | undefined {
  if (season.manifestId === undefined || season.namespaceKey === undefined) {
    return undefined
  }
  return configs.find(
    (config) =>
      config.manifestId === season.manifestId &&
      computeNamespaceKey(config) === season.namespaceKey
  )
}
