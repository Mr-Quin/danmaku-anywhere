import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from './schema'

export function isLegacyMacCms(config: { manifestId: string }): boolean {
  return config.manifestId === LEGACY_MACCMS_ID
}

// Defensive runtime check before rendering the legacy MacCMS episode UI.
export function assertMacCmsConfig(config: ProviderConfig): void {
  if (!isLegacyMacCms(config)) {
    throw new Error(
      `Provider type mismatch: expected ${LEGACY_MACCMS_ID}, got ${config.manifestId}`
    )
  }
}

// Without a config id the request went to the source automatic matching uses,
// which is the first enabled one that supports it.
export function findSourceName(
  configs: ProviderConfig[],
  providerConfigId?: string
): string | undefined {
  if (providerConfigId !== undefined) {
    return configs.find((config) => config.id === providerConfigId)?.name
  }
  return configs.find((config) => config.enabled && !isLegacyMacCms(config))
    ?.name
}
