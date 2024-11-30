import { configure } from '@danmaku-anywhere/danmaku-provider/ddp'

import { upgradeOptions } from '@/background/syncOptions/upgradeOptions'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'

export const setupOptions = async () => {
  chrome.runtime.onInstalled.addListener(async (details) => {
    try {
      await upgradeOptions()

      if (details.reason === 'update') {
        await extensionOptionsService.update({ showReleaseNotes: true })
      }
    } catch (err) {
      Logger.error(err)
    }

    if (details.reason === 'update') {
      Logger.info('Danmaku Anywhere Updated')
    } else {
      Logger.info('Danmaku Anywhere Installed')
    }
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
