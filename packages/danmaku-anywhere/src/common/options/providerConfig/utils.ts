import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig, ProviderConfigType } from './schema'

export function localizeProviderConfigType(type: ProviderConfigType): string {
  return `providers.type.${type}`
}

export function assertProviderImpl<T extends DanmakuSourceType>(
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
