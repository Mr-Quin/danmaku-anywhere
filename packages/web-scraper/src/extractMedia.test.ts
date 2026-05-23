import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractMedia } from './extractMedia.js'

vi.mock('./utils.js', () => ({
  createTab: vi.fn(),
  Logger: { debug: vi.fn(), log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { createTab } = await import('./utils.js')
const mockCreateTab = vi.mocked(createTab)

/**
 * Cleanup returned by extractMedia must be idempotent: the underlying tab
 * is removed once via onRemoved or by the port disconnect handler firing
 * concurrently with the 30s safety timeout, and onComplete then drives a
 * port.disconnect() that re-fires the disconnect handler. If cleanup is
 * not idempotent, port.disconnect runs on a dead port and listeners are
 * removed twice. These tests pin the contract: cleanup() is a no-op after
 * the first call.
 */

describe('extractMedia cleanup', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      webRequest: {
        onSendHeaders: { addListener: vi.fn(), removeListener: vi.fn() },
        onResponseStarted: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      tabs: {
        onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('runs onComplete exactly once when cleanup is invoked twice', async () => {
    const asyncDispose = vi.fn().mockResolvedValue(undefined)
    mockCreateTab.mockResolvedValue({
      tab: {} as chrome.tabs.Tab,
      tabId: 1,
      [Symbol.asyncDispose]: asyncDispose,
    })

    const onComplete = vi.fn()
    const cleanup = await extractMedia('https://example.com', {
      onMediaFound: vi.fn(),
      onError: vi.fn(),
      onComplete,
    })

    cleanup()
    cleanup()

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(asyncDispose).toHaveBeenCalledTimes(1)
  })

  it('removes each chrome listener exactly once when cleanup runs twice', async () => {
    mockCreateTab.mockResolvedValue({
      tab: {} as chrome.tabs.Tab,
      tabId: 1,
      [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined),
    })

    const cleanup = await extractMedia('https://example.com', {
      onMediaFound: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn(),
    })

    cleanup()
    cleanup()

    expect(
      chrome.webRequest.onSendHeaders.removeListener
    ).toHaveBeenCalledTimes(1)
    expect(
      chrome.webRequest.onResponseStarted.removeListener
    ).toHaveBeenCalledTimes(1)
    expect(chrome.tabs.onRemoved.removeListener).toHaveBeenCalledTimes(1)
  })
})
