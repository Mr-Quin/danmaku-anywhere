import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clearFakeChromeStorage,
  fakeChrome,
  resetFakeChrome,
} from './fakeChrome'

/**
 * The shared Chrome stand-in provides observable runtime and alarm APIs while
 * retaining the storage and alarm implementations' real behavior. Resetting it
 * clears stored data, listeners, and mock call history between test cases,
 * without disturbing mocks that do not belong to the Chrome fake.
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

  test('allows a test to replace a Chrome API implementation', () => {
    fakeChrome.storage.local.get.mockImplementation((_keys, callback) => {
      callback({ language: 'overridden' })
    })

    const read = vi.fn()
    fakeChrome.storage.local.get('language', read)

    expect(read).toHaveBeenCalledWith({ language: 'overridden' })
  })

  test('restores Chrome API implementations before the next test', async () => {
    await fakeChrome.storage.local.set({ language: 'en' })

    const read = vi.fn()
    fakeChrome.storage.local.get('language', read)

    expect(read).toHaveBeenCalledWith({
      language: 'en',
    })
  })

  test('reads back alarms created through the fake', async () => {
    await fakeChrome.alarms.create('refresh', { periodInMinutes: 60 })

    expect(await fakeChrome.alarms.get('refresh')).toEqual(
      expect.objectContaining({ name: 'refresh', periodInMinutes: 60 })
    )

    await fakeChrome.alarms.clear('refresh')

    expect(await fakeChrome.alarms.get('refresh')).toBeUndefined()
  })

  test('resetting leaves mocks outside the Chrome fake untouched', async () => {
    const unrelated = vi.fn()
    unrelated('called before the reset')

    resetFakeChrome()

    expect(unrelated).toHaveBeenCalledTimes(1)
  })

  test('storage can be cleared without clearing mock call history', async () => {
    const unrelated = vi.fn()
    unrelated('called before the storage clear')
    await fakeChrome.storage.local.set({ language: 'en' })

    clearFakeChromeStorage()

    const read = vi.fn()
    fakeChrome.storage.local.get(null, read)

    expect(read).toHaveBeenCalledWith({})
    expect(unrelated).toHaveBeenCalledTimes(1)
    expect(fakeChrome.storage.local.set).toHaveBeenCalledTimes(1)
  })
})
