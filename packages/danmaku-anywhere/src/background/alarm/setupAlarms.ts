import { DanmakuService } from '@/background/services/DanmakuService'
import { Logger } from '@/common/Logger'
import { alarmKeys } from '@/common/alarms/constants'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

// Create an alarm to purge old data
const createDanmakuPurgeAlarm = async () => {
  const { retentionPolicy } = await extensionOptionsService.get()

  /**
   * This is a workaround for the case where the extension is installed but the options are not set yet.
   * This can happen when the option migration is not complete.
   * TODO: remove after a few versions
   */
  if (!retentionPolicy) return

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

const clearDanmakuPurgeAlarm = async () => {
  Logger.debug('Clearing danmaku purge alarm')
  await chrome.alarms.clear(alarmKeys.PURGE_DANMAKU)
}

const createHandleDanmakuPurgeAlarm =
  (danmakuService: DanmakuService) => async (alarm: chrome.alarms.Alarm) => {
    if (alarm.name !== alarmKeys.PURGE_DANMAKU) {
      return
    }

    const extensionOptions = await extensionOptionsService.get()

    const days = extensionOptions.retentionPolicy.deleteCommentsAfter

    await danmakuService.purgeOlderThan(days)
  }

export const setupAlarms = (danmakuService: DanmakuService) => {
  extensionOptionsService.onChange(async (extensionOptions) => {
    if (!extensionOptions) return

    const { retentionPolicy } = extensionOptions

    if (retentionPolicy.enabled && retentionPolicy.deleteCommentsAfter > 0) {
      await createDanmakuPurgeAlarm()
    } else {
      await clearDanmakuPurgeAlarm()
    }
  })

  // doc says to check for alarms on script start because alarms are not guaranteed to be persistent
  // if this happens, we may miss an alarm
  void createDanmakuPurgeAlarm()

  const handleDanmakuPurgeAlarm = createHandleDanmakuPurgeAlarm(danmakuService)

  if (!chrome.alarms.onAlarm.hasListener(handleDanmakuPurgeAlarm)) {
    chrome.alarms.onAlarm.addListener(handleDanmakuPurgeAlarm)
  }
}
