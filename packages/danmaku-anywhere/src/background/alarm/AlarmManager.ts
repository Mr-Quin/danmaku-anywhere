import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { alarmKeys } from '@/common/alarms/constants'
import { Logger } from '@/common/Logger'
import {
  type ExtensionOptionsService,
  extensionOptionsServiceSymbol,
} from '@/common/options/extensionOptions/service'

@injectable('Singleton')
export class AlarmManager {
  constructor(
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(extensionOptionsServiceSymbol)
    private extensionOptionsService: ExtensionOptionsService
  ) {}

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

    const handleDanmakuPurgeAlarm = this.createHandleDanmakuPurgeAlarm()

    if (!chrome.alarms.onAlarm.hasListener(handleDanmakuPurgeAlarm)) {
      chrome.alarms.onAlarm.addListener(handleDanmakuPurgeAlarm)
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

    Logger.debug('Creating danmaku purge alarm')
    await chrome.alarms.create(alarmKeys.PURGE_DANMAKU, {
      periodInMinutes: 60 * 24, // 1 day
      // run at next midnight
      when: new Date().setHours(24, 0, 0, 0),
    })
  }

  private async clearDanmakuPurgeAlarm() {
    const alarm = await chrome.alarms.get(alarmKeys.PURGE_DANMAKU)

    if (alarm) {
      Logger.debug('Clearing danmaku purge alarm')
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
}
