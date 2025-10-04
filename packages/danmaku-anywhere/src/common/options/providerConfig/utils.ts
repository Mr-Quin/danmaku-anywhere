import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig, ProviderConfigType } from './schema'

export function assertProviderConfigImpl<T extends DanmakuSourceType>(
  config: ProviderConfig,
  type: T
): asserts config is Extract<
  ProviderConfig,
  {
    impl: T
  }
> {
  if (config.impl !== type) {
    throw new Error(
      `Provider type mismatch: expected ${type}, got ${config.type}`
    )
  }
}

export function assertProviderConfigType<T extends ProviderConfigType>(
  config: ProviderConfig,
  type: T
): asserts config is Extract<ProviderConfig, { type: T }> {
  if (config.type !== type) {
    throw new Error(
      `Provider type mismatch: expected ${type}, got ${config.type}`
    )
  }
}
