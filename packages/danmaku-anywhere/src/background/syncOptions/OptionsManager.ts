import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { tryCatch } from '@/common/utils/tryCatch'

@injectable()
export class OptionsManager {
  private logger: ILogger

  constructor(
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuOptionsService)
    private danmakuOptionsService: DanmakuOptionsService,
    @inject(OptionsUpgradeService)
    private upgradeService: OptionsUpgradeService,
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[OptionsManager]')
  }

  setup() {
    chrome.runtime.onInstalled.addListener((details) => {
      return this.onInstalled(details).catch((err) => {
        this.logger.error('Install handling failed', err)
      })
    })

    chrome.runtime.onStartup.addListener(() => {
      this.ensureUpgraded()
    })

    // The worker can be killed mid-upgrade, and the next wake may be a popup or
    // a message rather than an install or startup event.
    this.ensureUpgraded()
  }

  private async onInstalled(details: chrome.runtime.InstalledDetails) {
    this.ensureUpgraded()

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
  }

  // The upgrade service logs the failure and readiness reports it.
  private ensureUpgraded() {
    this.upgradeService.ensureUpgraded().catch(() => undefined)
  }
}
