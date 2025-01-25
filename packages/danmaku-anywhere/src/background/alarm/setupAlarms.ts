import { DanmakuService } from '@/background/services/DanmakuService'
import { alarmKeys } from '@/common/alarms/constants'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

// Create an alarm to purge old data
const createDanmakuPurgeAlarm = async () => {
  const { retentionPolicy } = await extensionOptionsService.get()

  if (!retentionPolicy.enabled || retentionPolicy.deleteCommentsAfter <= 0) {
    return
  }

  const alarm = await chrome.alarms.get(alarmKeys.danmakuPurge)

  if (alarm) {
    return
  }

  Logger.debug('Creating danmaku purge alarm')
  await chrome.alarms.create(alarmKeys.danmakuPurge, {
    periodInMinutes: 60 * 24, // 1 day
    // run at next midnight
    when: Date.now() + 1000 * 60 * 60 * (24 - new Date().getHours()),
  })
}

const clearDanmakuPurgeAlarm = async () => {
  Logger.debug('Clearing danmaku purge alarm')
  await chrome.alarms.clear(alarmKeys.danmakuPurge)
}

const handleDanmakuPurgeAlarm = async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name !== alarmKeys.danmakuPurge) {
    return
  }

  const extensionOptions = await extensionOptionsService.get()

  const days = extensionOptions.retentionPolicy.deleteCommentsAfter

  const danmakuService = new DanmakuService()

  await danmakuService.purgeOlderThan(days)
}

export const setupAlarms = () => {
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    // don't create alarm on install
    if (reason === 'install') return

    await createDanmakuPurgeAlarm()
  })

  chrome.runtime.onStartup.addListener(async () => {
    await createDanmakuPurgeAlarm()
  })

  extensionOptionsService.onChange(async (extensionOptions) => {
    if (!extensionOptions) return

    const { retentionPolicy } = extensionOptions

    if (retentionPolicy.enabled && retentionPolicy.deleteCommentsAfter > 0) {
      await createDanmakuPurgeAlarm()
    } else {
      await clearDanmakuPurgeAlarm()
    }
  })

  if (!chrome.alarms.onAlarm.hasListener(handleDanmakuPurgeAlarm)) {
    chrome.alarms.onAlarm.addListener(handleDanmakuPurgeAlarm)
  }
}
