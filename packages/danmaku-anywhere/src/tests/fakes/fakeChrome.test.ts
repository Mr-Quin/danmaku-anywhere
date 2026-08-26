import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeChrome, resetFakeChrome } from './fakeChrome'

/**
 * The shared Chrome stand-in provides observable runtime and alarm APIs while
 * retaining the storage implementation's real persistence behavior. Resetting
 * it clears stored data, listeners, and mock call history between test cases.
 */

describe('fakeChrome', () => {
  beforeEach(() => {
    resetFakeChrome()
  })

  test('resets storage values and Chrome API mock calls', async () => {
    await fakeChrome.storage.local.set({ language: 'en' })
    fakeChrome.runtime.onInstalled.addListener(vi.fn())
    await fakeChrome.alarms.create('refresh', { periodInMinutes: 60 })

    resetFakeChrome()

    const read = vi.fn()
    fakeChrome.storage.local.get('language', read)

    expect(read).toHaveBeenCalledWith({})
    expect(fakeChrome.runtime.onInstalled.addListener).not.toHaveBeenCalled()
    expect(fakeChrome.alarms.create).not.toHaveBeenCalled()
  })
})
