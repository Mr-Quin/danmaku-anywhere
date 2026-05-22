import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockChrome } from '@/tests/mockChromeApis'
import { hydratePopupHash, setupRoutePersistence } from './persistRoute'
import { routes } from './router'

/**
 * Verifies popup route persistence: hydration restores a previously stored
 * hash from chrome.storage.session when the popup opens at the default route,
 * skips restoration for deep-linked openings, and clears stale entries that
 * no longer match a known route. Also verifies the subscriber writes the
 * current pathname to session storage on idle navigations.
 */

const STORAGE_KEY = 'popup:lastRoute'

function setHash(hash: string) {
  window.location.hash = hash
}

describe('persistRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setHash('')
  })

  afterEach(() => {
    setHash('')
  })

  describe('hydratePopupHash', () => {
    test('restores stored hash when popup opens at root', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        [STORAGE_KEY]: '/config/import',
      })

      await hydratePopupHash(routes)

      expect(window.location.hash).toBe('#/config/import')
    })

    test('does nothing when no value is stored', async () => {
      mockChrome.storage.session.get.mockResolvedValue({})

      await hydratePopupHash(routes)

      expect(window.location.hash).toBe('')
    })

    test('does not override an existing non-root hash', async () => {
      setHash('#/styles')
      mockChrome.storage.session.get.mockResolvedValue({
        [STORAGE_KEY]: '/config/import',
      })

      await hydratePopupHash(routes)

      expect(window.location.hash).toBe('#/styles')
      expect(mockChrome.storage.session.get).not.toHaveBeenCalled()
    })

    test('clears storage when the stored route no longer matches', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        [STORAGE_KEY]: '/this/route/does/not/exist',
      })

      await hydratePopupHash(routes)

      expect(window.location.hash).toBe('')
      expect(mockChrome.storage.session.remove).toHaveBeenCalledWith(
        STORAGE_KEY
      )
    })

    test('ignores stored root path', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        [STORAGE_KEY]: '/',
      })

      await hydratePopupHash(routes)

      expect(window.location.hash).toBe('')
    })

    test('survives storage errors', async () => {
      mockChrome.storage.session.get.mockRejectedValue(new Error('boom'))

      await expect(hydratePopupHash(routes)).resolves.toBeUndefined()
      expect(window.location.hash).toBe('')
    })
  })

  describe('setupRoutePersistence', () => {
    test('writes the current pathname on idle navigation', () => {
      const unsubscribe = vi.fn()
      type Subscriber = (state: unknown) => void
      let subscriber: Subscriber | undefined
      const router = {
        subscribe: (fn: Subscriber) => {
          subscriber = fn
          return unsubscribe
        },
      } as unknown as Parameters<typeof setupRoutePersistence>[0]

      const teardown = setupRoutePersistence(router)
      expect(subscriber).toBeDefined()

      subscriber?.({
        navigation: { state: 'idle' },
        location: { pathname: '/config/import', search: '' },
      })

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        [STORAGE_KEY]: '/config/import',
      })

      teardown()
      expect(unsubscribe).toHaveBeenCalled()
    })

    test('skips writes while a navigation is in flight', () => {
      type Subscriber = (state: unknown) => void
      let subscriber: Subscriber | undefined
      const router = {
        subscribe: (fn: Subscriber) => {
          subscriber = fn
          return () => {}
        },
      } as unknown as Parameters<typeof setupRoutePersistence>[0]

      setupRoutePersistence(router)
      subscriber?.({
        navigation: { state: 'loading' },
        location: { pathname: '/config/import', search: '' },
      })

      expect(mockChrome.storage.session.set).not.toHaveBeenCalled()
    })

    test('does not write the same path twice in a row', () => {
      type Subscriber = (state: unknown) => void
      let subscriber: Subscriber | undefined
      const router = {
        subscribe: (fn: Subscriber) => {
          subscriber = fn
          return () => {}
        },
      } as unknown as Parameters<typeof setupRoutePersistence>[0]

      setupRoutePersistence(router)
      const idleAt = (pathname: string) => ({
        navigation: { state: 'idle' },
        location: { pathname, search: '' },
      })

      subscriber?.(idleAt('/styles'))
      subscriber?.(idleAt('/styles'))
      subscriber?.(idleAt('/mount'))

      expect(mockChrome.storage.session.set).toHaveBeenCalledTimes(2)
    })
  })
})
