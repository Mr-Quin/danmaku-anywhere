import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from './schema'

// Defensive runtime check. Does NOT narrow `configValues` — that field is
// opaque at the type level. Use local cast helpers in the consumer when
// reading typed fields.
export function assertProviderConfigImpl(
  config: ProviderConfig,
  impl: DanmakuSourceType
): void {
  if (config.impl !== impl) {
    throw new Error(
      `Provider type mismatch: expected ${impl}, got ${config.impl}`
    )
  }
}
