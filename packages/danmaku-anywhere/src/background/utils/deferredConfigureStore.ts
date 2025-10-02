import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

export const deferredConfigureStore = async () => {
  try {
    const { id, danmakuSources } = await extensionOptionsService.get()
    if (id) {
      configureApiStore({ daId: id })
    }
    configureApiStore({
      ddpUseCustomUrl: danmakuSources.dandanplay.useCustomRoot,
      ddpCustomApiUrl: danmakuSources.dandanplay.baseUrl,
    })
  } catch (e: unknown) {
    console.error('Failed to configure headers:', e)
  }
  extensionOptionsService.onChange((options) => {
    const ddpOptions = options.danmakuSources.dandanplay
    configureApiStore({
      ddpUseCustomUrl: ddpOptions.useCustomRoot,
      ddpCustomApiUrl: ddpOptions.baseUrl,
    })
  })
}
