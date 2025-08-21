import { upgradeOptions } from '@/background/syncOptions/upgradeOptions'
import { Logger } from '@/common/Logger'
import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { tryCatch } from '@/common/utils/utils'

const tryUpgradeOptions = async () => {
  try {
    await upgradeOptions()
  } catch (err) {
    Logger.error(err)
  }
}

export const setupOptions = () => {
  chrome.runtime.onInstalled.addListener(async (details) => {
    await tryUpgradeOptions()

    if (details.reason === 'update') {
      await extensionOptionsService.update({ showReleaseNotes: true })
      Logger.info('Danmaku Anywhere Updated')
    } else {
      Logger.info('Danmaku Anywhere Installed')
    }

    if (details.reason === 'install') {
      // if mobile, update styles to be more mobile friendly
      void tryCatch(async () => {
        const platformInfo = await chrome.runtime.getPlatformInfo()
        if (platformInfo.os === 'android') {
          Logger.info('Updating danmaku style for android')
          const existing = await danmakuOptionsService.get()
          return danmakuOptionsService.update({
            style: {
              ...existing.style,
              fontSize: 18,
            },
            trackHeight: 20,
          })
        }
      })
    }
  })

  // configure dandanplay api on init and when options change
  chrome.runtime.onStartup.addListener(async () => {
    // Try to upgrade options on startup in case the onInstalled one failed
    await tryUpgradeOptions()
  })
}
