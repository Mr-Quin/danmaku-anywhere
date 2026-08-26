import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createFakeChromeStorage } from './fakeChromeStorage'

/**
 * Fake chrome.storage keeps each storage area isolated and mirrors Chrome's
 * promise and callback read APIs. It notifies listeners with exact old/new
 * values so storage-backed services can be exercised without mock behavior.
 */

describe('createFakeChromeStorage', () => {
  const storage = createFakeChromeStorage()

  beforeEach(() => {
    storage.reset()
  })

  test('keeps values isolated by storage area', async () => {
    await storage.local.set({ language: 'en' })
    await storage.sync.set({ language: 'zh' })

    expect(await storage.local.get('language')).toEqual({ language: 'en' })
    expect(await storage.sync.get('language')).toEqual({ language: 'zh' })
    expect(await storage.session.get('language')).toEqual({})
  })

  test('supports callback reads', async () => {
    await storage.local.set({ version: 1 })

    const callback = vi.fn()
    storage.local.get('version', callback)

    expect(callback).toHaveBeenCalledWith({ version: 1 })
  })

  test('emits old and new values for mutations', async () => {
    const listener = vi.fn()
    storage.local.onChanged.addListener(listener)

    await storage.local.set({ language: 'en' })
    await storage.local.set({ language: 'zh' })
    await storage.local.remove('language')

    expect(listener).toHaveBeenNthCalledWith(1, {
      language: { oldValue: undefined, newValue: 'en' },
    })
    expect(listener).toHaveBeenNthCalledWith(2, {
      language: { oldValue: 'en', newValue: 'zh' },
    })
    expect(listener).toHaveBeenNthCalledWith(3, {
      language: { oldValue: 'zh', newValue: undefined },
    })
  })

  test('clears values and notifies listeners for every removed key', async () => {
    const listener = vi.fn()
    storage.local.onChanged.addListener(listener)
    await storage.local.set({ language: 'en', version: 1 })
    listener.mockClear()

    await storage.local.clear()

    expect(listener).toHaveBeenCalledWith({
      language: { oldValue: 'en', newValue: undefined },
      version: { oldValue: 1, newValue: undefined },
    })
    expect(await storage.local.get(null)).toEqual({})
  })

  test('reset clears values and registered listeners', async () => {
    const listener = vi.fn()
    storage.local.onChanged.addListener(listener)
    await storage.local.set({ language: 'en' })

    storage.reset()
    await storage.local.set({ language: 'zh' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(await storage.local.get(null)).toEqual({ language: 'zh' })
  })
})
