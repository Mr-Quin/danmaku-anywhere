import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

export const deferredConfigureStore = async () => {
  try {
    const { id, danmakuSources } = await extensionOptionsService.get()
    if (id) {
      configureApiStore({ daId: id })
    }
    if (danmakuSources?.dandanplay?.baseUrl) {
      configureApiStore({ ddpBaseUrl: danmakuSources.dandanplay.baseUrl })
    }
  } catch (e: unknown) {
    console.error('Failed to configure headers:', e)
  }
  extensionOptionsService.onChange((options) => {
    const url = options.danmakuSources.dandanplay.baseUrl
    if (url) {
      configureApiStore({ baseUrl: url })
    }
  })
}
