import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'

export const deferredConfigureStore = async () => {
  try {
    const extensionOptionsService = container.get(ExtensionOptionsService)
    const { id } = await extensionOptionsService.get()
    if (id) {
      configureApiStore({ daId: id })
    }
  } catch (e: unknown) {
    console.error('Failed to configure headers:', e)
  }
}
