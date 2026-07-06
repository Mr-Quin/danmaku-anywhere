import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { computeNamespaceKey } from './namespaceKey'

// Which config fields identify an instance, per manifest (the manifest's
// identityFields declaration). Missing manifests resolve as declaring none.
export type IdentityFieldsByManifest = Record<string, readonly string[]>

export function resolveSeasonConfig(
  season: { manifestId?: string; namespaceKey?: string },
  configs: ProviderConfig[],
  identityFields: IdentityFieldsByManifest
): ProviderConfig | undefined {
  if (season.manifestId == null || season.namespaceKey == null) {
    return undefined
  }
  return configs.find(
    (config) =>
      config.manifestId === season.manifestId &&
      computeNamespaceKey(config, identityFields[config.manifestId] ?? []) ===
        season.namespaceKey
  )
}
