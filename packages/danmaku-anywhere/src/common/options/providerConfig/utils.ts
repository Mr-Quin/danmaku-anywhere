import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from './schema'

// Defensive runtime check before rendering the legacy MacCMS episode UI.
export function assertMacCmsConfig(config: ProviderConfig): void {
  if (config.manifestId !== LEGACY_MACCMS_ID) {
    throw new Error(
      `Provider type mismatch: expected ${LEGACY_MACCMS_ID}, got ${config.manifestId}`
    )
  }
}
