export type AlarmListener = (alarm: chrome.alarms.Alarm) => void | Promise<void>

export interface FakeChromeAlarms {
  get(name: string): Promise<chrome.alarms.Alarm | undefined>
  create(name: string, alarmInfo?: chrome.alarms.AlarmCreateInfo): Promise<void>
  clear(name?: string): Promise<boolean>
  onAlarm: {
    addListener(listener: AlarmListener): void
    removeListener(listener: AlarmListener): void
    hasListener(listener: AlarmListener): boolean
  }
  dispatch(alarm: chrome.alarms.Alarm): Promise<void>
  reset(): void
}

function scheduledTime(alarmInfo: chrome.alarms.AlarmCreateInfo): number {
  if (alarmInfo.when !== undefined) {
    return alarmInfo.when
  }

  const delayInMinutes = alarmInfo.delayInMinutes ?? alarmInfo.periodInMinutes

  if (delayInMinutes !== undefined) {
    return Date.now() + delayInMinutes * 60_000
  }

  return Date.now()
}

export function createFakeChromeAlarms(): FakeChromeAlarms {
  const alarms = new Map<string, chrome.alarms.Alarm>()
  const listeners = new Set<AlarmListener>()

  return {
    async get(name: string) {
      return alarms.get(name)
    },
    async create(name: string, alarmInfo: chrome.alarms.AlarmCreateInfo = {}) {
      alarms.set(name, {
        name,
        scheduledTime: scheduledTime(alarmInfo),
        periodInMinutes: alarmInfo.periodInMinutes,
      })
    },
    async clear(name?: string) {
      if (name === undefined) {
        const hadAlarms = alarms.size > 0
        alarms.clear()
        return hadAlarms
      }

      return alarms.delete(name)
    },
    onAlarm: {
      addListener(listener: AlarmListener) {
        listeners.add(listener)
      },
      removeListener(listener: AlarmListener) {
        listeners.delete(listener)
      },
      hasListener(listener: AlarmListener) {
        return listeners.has(listener)
      },
    },
    async dispatch(alarm: chrome.alarms.Alarm) {
      for (const listener of listeners) {
        await listener(alarm)
      }
    },
    reset() {
      alarms.clear()
      listeners.clear()
    },
  }
}
