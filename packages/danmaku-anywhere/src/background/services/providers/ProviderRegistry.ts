import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

export class ProviderRegistry {
  private providers = new Map<DanmakuSourceType, IDanmakuProvider>()

  register(type: DanmakuSourceType, provider: IDanmakuProvider) {
    this.providers.set(type, provider)
  }

  get(type: DanmakuSourceType): IDanmakuProvider | undefined {
    return this.providers.get(type)
  }

  mustGet(type: DanmakuSourceType): IDanmakuProvider {
    const provider = this.get(type)
    if (!provider) {
      throw new Error(`Provider not found for type: ${type}`)
    }
    return provider
  }
}
