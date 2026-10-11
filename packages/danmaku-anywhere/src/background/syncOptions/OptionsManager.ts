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
    chrome.runtime.onInstalled.addListener((details) => {
      return this.onInstalled(details).catch((err) => {
        this.logger.error('Install handling failed', err)
      })
    })

    chrome.runtime.onStartup.addListener(() => {
      void this.upgradeOnce()
    })

    // The worker can be killed mid-upgrade, and the next wake may be a popup or
    // a message rather than an install or startup event.
    this.upgradeIfVersionChanged().catch((err) => {
      this.logger.error('Upgrade check failed', err)
    })
  }

  private async onInstalled(details: chrome.runtime.InstalledDetails) {
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
  }

  private async upgradeIfVersionChanged() {
    const [isCurrent, err] = await tryCatch(() =>
      this.readinessService.isCurrentVersion()
    )
    if (err) {
      this.logger.error('Failed to read last version, upgrading anyway', err)
    } else if (isCurrent) {
      return
    }
    await this.upgradeOnce()
  }

  // Shared by every event that asks for an upgrade. A failed run is dropped so
  // the next event starts over instead of reusing the failure.
  private upgradeOnce(): Promise<void> {
    this.upgrading ??= this.upgradeService.upgrade().catch((err) => {
      this.upgrading = undefined
      this.logger.error('Options upgrade failed', err)
    })
    return this.upgrading
  }
}
