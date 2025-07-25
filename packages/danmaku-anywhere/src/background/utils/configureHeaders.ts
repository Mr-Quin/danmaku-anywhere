import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

export const configureHeaders = async () => {
  try {
    const { id } = await extensionOptionsService.get()
    if (id) {
      configureApiStore({ headers: { 'DA-Extension-Id': id } })
    }
  } catch (e: unknown) {
    console.error('Failed to configure headers:', e)
  }
}
