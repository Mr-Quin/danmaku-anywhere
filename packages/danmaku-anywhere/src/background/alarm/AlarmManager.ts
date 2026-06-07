import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { ProviderService } from '@/background/services/providers/ProviderService'
import { alarmKeys } from '@/common/alarms/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'

@injectable('Singleton')
export class AlarmManager {
  private logger: ILogger

  constructor(
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(ProviderService)
    private providerService: ProviderService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[AlarmManager]')
  }

  setup() {
    this.extensionOptionsService.onChange(async (extensionOptions) => {
      if (!extensionOptions) return

      const { retentionPolicy } = extensionOptions

      if (retentionPolicy.enabled && retentionPolicy.deleteCommentsAfter > 0) {
        await this.createDanmakuPurgeAlarm()
      } else {
        await this.clearDanmakuPurgeAlarm()
      }
    })

    // doc says to check for alarms on script start because alarms are not guaranteed to be persistent
    // if this happens, we may miss an alarm
    void this.createDanmakuPurgeAlarm()
    void this.createManifestRefreshAlarm()

    const handleDanmakuPurgeAlarm = this.createHandleDanmakuPurgeAlarm()

    if (!chrome.alarms.onAlarm.hasListener(handleDanmakuPurgeAlarm)) {
      chrome.alarms.onAlarm.addListener(handleDanmakuPurgeAlarm)
    }
    if (!chrome.alarms.onAlarm.hasListener(this.handleManifestRefreshAlarm)) {
      chrome.alarms.onAlarm.addListener(this.handleManifestRefreshAlarm)
    }
  }

  // Create an alarm to purge old data
  private async createDanmakuPurgeAlarm() {
    const { retentionPolicy } = await this.extensionOptionsService.get()

    if (!retentionPolicy.enabled || retentionPolicy.deleteCommentsAfter <= 0) {
      return
    }

    const alarm = await chrome.alarms.get(alarmKeys.PURGE_DANMAKU)

    if (alarm) {
      return
    }

    this.logger.debug('Creating danmaku purge alarm')
    await chrome.alarms.create(alarmKeys.PURGE_DANMAKU, {
      periodInMinutes: 60 * 24, // 1 day
      // run at next midnight
      when: new Date().setHours(24, 0, 0, 0),
    })
  }

  private async clearDanmakuPurgeAlarm() {
    const alarm = await chrome.alarms.get(alarmKeys.PURGE_DANMAKU)

    if (alarm) {
      this.logger.debug('Clearing danmaku purge alarm')
      await chrome.alarms.clear(alarmKeys.PURGE_DANMAKU)
    }
  }

  private createHandleDanmakuPurgeAlarm =
    () => async (alarm: chrome.alarms.Alarm) => {
      if (alarm.name !== alarmKeys.PURGE_DANMAKU) {
        return
      }

      const extensionOptions = await this.extensionOptionsService.get()

      const days = extensionOptions.retentionPolicy.deleteCommentsAfter

      await this.danmakuService.purgeOlderThan(days)
    }

  private async createManifestRefreshAlarm() {
    const alarm = await chrome.alarms.get(alarmKeys.REFRESH_MANIFESTS)

    if (alarm) {
      return
    }

    this.logger.debug('Creating manifest refresh alarm')
    await chrome.alarms.create(alarmKeys.REFRESH_MANIFESTS, {
      periodInMinutes: 60 * 12,
      delayInMinutes: 60,
    })
  }

  // Stable reference so the hasListener guard in setup actually dedupes.
  private handleManifestRefreshAlarm = async (alarm: chrome.alarms.Alarm) => {
    if (alarm.name !== alarmKeys.REFRESH_MANIFESTS) {
      return
    }

    await this.providerService.syncCatalog()
  }
}
