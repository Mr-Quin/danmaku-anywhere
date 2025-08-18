import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

export const generateId = () => {
  chrome.runtime.onInstalled.addListener(async () => {
    const _generateId = async () => {
      const { id } = await extensionOptionsService.get()
      if (id) {
        return id
      }

      const newId = crypto.randomUUID()
      await extensionOptionsService.update({ id: newId })

      return newId
    }

    const id = await _generateId()

    if (id) {
      configureApiStore({ daId: id })
      return
    }
  })
}
