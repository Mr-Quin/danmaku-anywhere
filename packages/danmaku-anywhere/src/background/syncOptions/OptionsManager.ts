import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { tryCatch } from '@/common/utils/tryCatch'
import { UpgradeService } from './UpgradeService/UpgradeService'

@injectable()
export class OptionsManager {
  private logger: ILogger

  constructor(
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuOptionsService)
    private danmakuOptionsService: DanmakuOptionsService,
    @inject(UpgradeService)
    private upgradeService: UpgradeService,
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[OptionsManager]')
  }

  setup() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      this.tryUpgradeOptions()

      if (details.reason === 'update') {
        await this.extensionOptionsService.update({ showReleaseNotes: true })
        this.logger.info('Danmaku Anywhere Updated')
      } else {
        this.logger.info('Danmaku Anywhere Installed')
      }

      if (details.reason === 'install') {
        // if mobile, update styles to be more mobile friendly
        void tryCatch(async () => {
          const platformInfo = await chrome.runtime.getPlatformInfo()
          if (platformInfo.os === 'android') {
            this.logger.info('Updating danmaku style for android')
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
      await this.tryUpgradeOptions()
    })
  }

  private async tryUpgradeOptions() {
    try {
      await this.upgradeService.upgrade()
    } catch (err) {
      this.logger.error(err)
    }
  }
}
