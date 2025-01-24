import { configure } from '@danmaku-anywhere/danmaku-provider/ddp'

import { upgradeOptions } from '@/background/syncOptions/upgradeOptions'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

const configureDandanplay = (useProxy: boolean) => {
  if (useProxy) {
    configure({
      baseUrl: import.meta.env.VITE_PROXY_URL,
      APP_ID: '',
      APP_SECRET: '',
    })
  } else {
    configure({
      baseUrl: 'https://api.dandanplay.net',
      APP_ID: import.meta.env.VITE_DANDANPLAY_APP_ID,
      APP_SECRET: import.meta.env.VITE_DANDANPLAY_APP_SECRET,
    })
  }
}

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

    const options = await extensionOptionsService.get()
    configureDandanplay(options.danmakuSources.dandanplay.useProxy)
  })

  // configure dandanplay api on init and when options change
  chrome.runtime.onStartup.addListener(async () => {
    const options = await extensionOptionsService.get()
    configureDandanplay(options.danmakuSources.dandanplay.useProxy)
  })

  extensionOptionsService.onChange((options) => {
    if (!options) return
    configureDandanplay(options.danmakuSources.dandanplay.useProxy)
  })
}
