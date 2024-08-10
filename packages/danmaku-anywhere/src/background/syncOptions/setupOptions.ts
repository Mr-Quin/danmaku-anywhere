import { configure } from '@danmaku-anywhere/danmaku-provider/ddp'

import { upgradeOptions } from '@/background/syncOptions/upgradeOptions'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'

export const setupOptions = async () => {
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await upgradeOptions()
    } catch (err) {
      Logger.error(err)
    }

    Logger.info('Danmaku Anywhere Installed')
  })

  // configure dandanplay api on init and when options change
  chrome.runtime.onStartup.addListener(async () => {
    const options = await extensionOptionsService.get()

    configure({
      baseUrl: options.danmakuSources.dandanplay.baseUrl,
    })
  })

  extensionOptionsService.onChange((options) => {
    if (!options) return
    configure({
      baseUrl: options.danmakuSources.dandanplay.baseUrl,
    })
  })
}
