import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { BilibiliService } from './bilibili/BilibiliService'
import type { DanDanPlayService } from './dandanplay/DanDanPlayService'
import type { MacCmsProviderService } from './MacCmsProviderService'
import type { TencentService } from './tencent/TencentService'

type ProviderFactory = (config: ProviderConfig) => IDanmakuProvider

interface ServiceMap {
  [DanmakuSourceType.DanDanPlay]: DanDanPlayService
  [DanmakuSourceType.Bilibili]: BilibiliService
  [DanmakuSourceType.Tencent]: TencentService
  [DanmakuSourceType.MacCMS]: MacCmsProviderService
}

export class ProviderRegistry {
  private factories = new Map<DanmakuSourceType, ProviderFactory>()

  register<T extends ProviderConfig>(
    type: DanmakuSourceType,
    factory: (config: T) => IDanmakuProvider
  ) {
    this.factories.set(type, factory as ProviderFactory)
  }

  create<T extends ProviderConfig>(config: T): IDanmakuProvider {
    const factory = this.factories.get(config.impl)
    if (!factory) {
      throw new Error(`Provider factory not found for type: ${config.impl}`)
    }
    return factory(config)
  }

  createTyped<T extends ProviderConfig>(config: T): ServiceMap[T['impl']] {
    return this.create(config) as ServiceMap[T['impl']]
  }
}
