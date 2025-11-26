import { inject, injectable } from 'inversify'
import { upgradeOptions } from '@/background/syncOptions/upgradeOptions'
import { Logger } from '@/common/Logger'
import {
  type DanmakuOptionsService,
  danmakuOptionsServiceSymbol,
} from '@/common/options/danmakuOptions/service'
import {
  type ExtensionOptionsService,
  extensionOptionsServiceSymbol,
} from '@/common/options/extensionOptions/service'
import { tryCatch } from '@/common/utils/utils'

const tryUpgradeOptions = async () => {
  try {
    await upgradeOptions()
  } catch (err) {
    Logger.error(err)
  }
}

@injectable()
export class OptionsManager {
  constructor(
    @inject(extensionOptionsServiceSymbol)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(danmakuOptionsServiceSymbol)
    private danmakuOptionsService: DanmakuOptionsService
  ) {}

  setup() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      await tryUpgradeOptions()

      if (details.reason === 'update') {
        await this.extensionOptionsService.update({ showReleaseNotes: true })
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
            const existing = await this.danmakuOptionsService.get()
            return this.danmakuOptionsService.update({
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
}
