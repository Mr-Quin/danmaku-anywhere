import { describe, expect, test, vi } from 'vitest'
import { createFakeChromeAlarms } from './fakeChromeAlarms'

/**
 * Fake chrome.alarms keeps created alarms in memory so create/get/clear behave
 * like the real API: a created alarm is readable, creating it again replaces it,
 * and clearing it makes it unreadable. Dispatch drives registered listeners.
 */

describe('createFakeChromeAlarms', () => {
  test('reads back an alarm that was created', async () => {
    const alarms = createFakeChromeAlarms()

    await alarms.create('refresh', { periodInMinutes: 60, when: 1000 })

    expect(await alarms.get('refresh')).toEqual({
      name: 'refresh',
      scheduledTime: 1000,
      periodInMinutes: 60,
    })
    expect(await alarms.get('purge')).toBeUndefined()
  })

  test('replaces an existing alarm on create', async () => {
    const alarms = createFakeChromeAlarms()

    await alarms.create('refresh', { periodInMinutes: 60 })
    await alarms.create('refresh', { periodInMinutes: 720 })

    const alarm = await alarms.get('refresh')
    expect(alarm?.periodInMinutes).toBe(720)
  })

  test('clear removes a single alarm and reports whether it existed', async () => {
    const alarms = createFakeChromeAlarms()
    await alarms.create('refresh')

    expect(await alarms.clear('refresh')).toBe(true)
    expect(await alarms.clear('refresh')).toBe(false)
    expect(await alarms.get('refresh')).toBeUndefined()
  })

  test('clear without a name removes every alarm', async () => {
    const alarms = createFakeChromeAlarms()
    await alarms.create('refresh')
    await alarms.create('purge')

    expect(await alarms.clear()).toBe(true)

    expect(await alarms.get('refresh')).toBeUndefined()
    expect(await alarms.get('purge')).toBeUndefined()
    expect(await alarms.clear()).toBe(false)
  })

  test('dispatch runs registered listeners and skips removed ones', async () => {
    const alarms = createFakeChromeAlarms()
    const listener = vi.fn()
    const removed = vi.fn()

    alarms.onAlarm.addListener(listener)
    alarms.onAlarm.addListener(removed)
    alarms.onAlarm.removeListener(removed)

    expect(alarms.onAlarm.hasListener(listener)).toBe(true)
    expect(alarms.onAlarm.hasListener(removed)).toBe(false)

    const alarm = { name: 'refresh', scheduledTime: 0 }
    await alarms.dispatch(alarm)

    expect(listener).toHaveBeenCalledWith(alarm)
    expect(removed).not.toHaveBeenCalled()
  })

  test('reset drops alarms and listeners', async () => {
    const alarms = createFakeChromeAlarms()
    const listener = vi.fn()
    alarms.onAlarm.addListener(listener)
    await alarms.create('refresh')

    alarms.reset()
    await alarms.dispatch({ name: 'refresh', scheduledTime: 0 })

    expect(await alarms.get('refresh')).toBeUndefined()
    expect(listener).not.toHaveBeenCalled()
  })
})
