import { upgradeOptions } from '@/background/syncOptions/upgradeOptions'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

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
  })

  // configure dandanplay api on init and when options change
  chrome.runtime.onStartup.addListener(async () => {
    // Try to upgrade options on startup in case the onInstalled one failed
    await tryUpgradeOptions()
  })
}
