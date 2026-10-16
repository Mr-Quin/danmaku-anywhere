import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import type { SourceRef } from '@/common/errors/AppError'
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

export function toSourceRef(config: ProviderConfig, name: string): SourceRef {
  return {
    providerConfigId: config.id,
    manifestId: config.manifestId,
    name,
  }
}
