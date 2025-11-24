import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'

export class ProviderRegistry {
  private providers = new Map<DanmakuSourceType, IDanmakuProvider>()

  register(type: DanmakuSourceType, provider: IDanmakuProvider) {
    this.providers.set(type, provider)
  }

  get(type: DanmakuSourceType): IDanmakuProvider | undefined {
    return this.providers.get(type)
  }
}
