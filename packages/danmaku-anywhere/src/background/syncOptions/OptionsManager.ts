import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { tryCatch } from '@/common/utils/tryCatch'
import { UpgradeService } from './UpgradeService/UpgradeService'

@injectable()
export class OptionsManager {
  private logger: ILogger
  private upgrading?: Promise<void>

  constructor(
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuOptionsService)
    private danmakuOptionsService: DanmakuOptionsService,
    @inject(UpgradeService)
    private upgradeService: UpgradeService,
    @inject(ReadinessService)
    private readinessService: ReadinessService,
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[OptionsManager]')
  }

  setup() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      void this.upgradeOnce()

      if (details.reason === 'update') {
        if (!import.meta.env.DEV) {
          await this.extensionOptionsService.update({ showReleaseNotes: true })
        }
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

    chrome.runtime.onStartup.addListener(() => {
      void this.upgradeOnce()
    })

    // The worker can be killed mid-upgrade, and the next wake may be a popup or
    // a message rather than an install or startup event.
    void this.upgradeIfVersionChanged()
  }

  private async upgradeIfVersionChanged() {
    if (await this.readinessService.isCurrentVersion()) {
      return
    }
    await this.upgradeOnce()
  }

  private upgradeOnce() {
    this.upgrading ??= this.upgradeService.upgrade().catch((err) => {
      this.logger.error(err)
    })
    return this.upgrading
  }
}
