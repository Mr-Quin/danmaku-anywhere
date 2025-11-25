import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

type ProviderFactory = (config: ProviderConfig) => IDanmakuProvider

export class ProviderRegistry {
  private factories = new Map<DanmakuSourceType, ProviderFactory>()

  register<T extends ProviderConfig>(
    type: DanmakuSourceType,
    factory: (config: T) => IDanmakuProvider
  ) {
    this.factories.set(type, factory as ProviderFactory)
  }

  create(config: ProviderConfig): IDanmakuProvider {
    const factory = this.factories.get(config.impl)
    if (!factory) {
      throw new Error(`Provider factory not found for type: ${config.impl}`)
    }
    return factory(config)
  }
}
