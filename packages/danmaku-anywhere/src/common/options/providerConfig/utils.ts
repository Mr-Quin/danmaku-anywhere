import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from './schema'

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
