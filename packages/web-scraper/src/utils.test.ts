import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTab } from './utils.js'

/**
 * createTab opens a minimized window then navigates its tab. If any step
 * after chrome.windows.create succeeds throws (chrome.tabs.update failure,
 * polling timeout in waitForTabUpdate, or waitForTabNavigation failure),
 * the window must be closed. These tests cover each leak path.
 */

type ChromeMock = {
  windows: {
    create: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }
  tabs: {
    update: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    onRemoved: {
      addListener: ReturnType<typeof vi.fn>
      removeListener: ReturnType<typeof vi.fn>
    }
  }
  webNavigation: {
    onCompleted: {
      addListener: ReturnType<typeof vi.fn>
      removeListener: ReturnType<typeof vi.fn>
    }
    onErrorOccurred: {
      addListener: ReturnType<typeof vi.fn>
      removeListener: ReturnType<typeof vi.fn>
    }
  }
}

describe('createTab error-path cleanup', () => {
  let chromeMock: ChromeMock

  beforeEach(() => {
    chromeMock = {
      windows: {
        create: vi.fn(),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      tabs: {
        update: vi.fn(),
        get: vi.fn(),
        remove: vi.fn().mockResolvedValue(undefined),
        onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      webNavigation: {
        onCompleted: { addListener: vi.fn(), removeListener: vi.fn() },
        onErrorOccurred: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    }
    vi.stubGlobal('chrome', chromeMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('removes the window when chrome.tabs.update throws after windows.create succeeds', async () => {
    chromeMock.windows.create.mockResolvedValue({
      id: 100,
      tabs: [{ id: 1 }],
    })
    chromeMock.tabs.update.mockRejectedValue(new Error('No tab with id'))

    await expect(createTab('https://example.com')).rejects.toThrow(
      'No tab with id'
    )

    expect(chromeMock.windows.remove).toHaveBeenCalledWith(100)
  })

  it('removes the window when waitForTabUpdate times out', async () => {
    vi.useFakeTimers()

    chromeMock.windows.create.mockResolvedValue({
      id: 100,
      tabs: [{ id: 1 }],
    })
    chromeMock.tabs.update.mockResolvedValue({ id: 1 })
    chromeMock.tabs.get.mockResolvedValue({
      id: 1,
      url: 'chrome://new-tab-page/',
    })

    const promise = createTab('https://example.com')
    const settled = promise.catch((e) => e)

    await vi.advanceTimersByTimeAsync(11000)

    const result = await settled
    expect(result).toBeInstanceOf(Error)

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith(1)
    expect(chromeMock.windows.remove).toHaveBeenCalledWith(100)
  })

  it('removes the window when waitForTabNavigation rejects', async () => {
    chromeMock.windows.create.mockResolvedValue({
      id: 100,
      tabs: [{ id: 1 }],
    })
    chromeMock.tabs.update.mockResolvedValue({ id: 1 })
    chromeMock.tabs.get.mockResolvedValue({
      id: 1,
      url: 'https://example.com',
    })

    const promise = createTab('https://example.com', {
      waitForNavigation: true,
    })
    const settled = promise.catch((e) => e)

    await vi.waitFor(() => {
      expect(
        chromeMock.webNavigation.onErrorOccurred.addListener
      ).toHaveBeenCalled()
    })

    const errorListener =
      chromeMock.webNavigation.onErrorOccurred.addListener.mock.calls[0][0]
    errorListener({
      tabId: 1,
      frameId: 0,
      url: 'https://example.com',
      error: 'net::ERR_FAILED',
    })

    const result = await settled
    expect(result).toBeInstanceOf(Error)

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith(1)
    expect(chromeMock.windows.remove).toHaveBeenCalledWith(100)
  })
})
