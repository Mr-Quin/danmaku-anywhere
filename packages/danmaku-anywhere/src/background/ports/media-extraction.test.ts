import { extractMedia } from '@danmaku-anywhere/web-scraper'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { portNames } from '@/common/ports/portNames'
import { setupExtractMedia } from './media-extraction'

vi.mock('@danmaku-anywhere/web-scraper', () => ({
  extractMedia: vi.fn(),
}))

const mockExtractMedia = vi.mocked(extractMedia)

/**
 * The extract-media port handler bridges a content-script port to the
 * scraper pipeline. Three race conditions can orphan a scraping window:
 *   1. The port disconnects while extractMedia is still awaiting setup,
 *      so the disconnect handler finds no cleanup yet.
 *   2. Two ports from one tab clobber each other in the tab-id-keyed
 *      cleanup map.
 *   3. The 30s safety timer survives disconnect and re-fires cleanup on
 *      a dead port.
 * These tests pin each behaviour: every started extraction has its
 * cleanup invoked exactly once when its port disconnects.
 */

type ConnectListener = (port: chrome.runtime.Port) => void

interface FakePort {
  port: chrome.runtime.Port
  emitMessage(msg: unknown): void
  simulateDisconnect(): void
}

function createFakePort(name: string, tabId: number): FakePort {
  const messageListeners: Array<(msg: unknown) => void> = []
  const disconnectListeners: Array<(port: chrome.runtime.Port) => void> = []
  const port = {
    name,
    sender: { tab: { id: tabId } },
    postMessage: vi.fn(),
    disconnect: vi.fn(),
    onMessage: {
      addListener: vi.fn((cb: (msg: unknown) => void) =>
        messageListeners.push(cb)
      ),
    },
    onDisconnect: {
      addListener: vi.fn((cb: (port: chrome.runtime.Port) => void) =>
        disconnectListeners.push(cb)
      ),
    },
  } as unknown as chrome.runtime.Port

  return {
    port,
    emitMessage(msg) {
      messageListeners.forEach((l) => l(msg))
    },
    simulateDisconnect() {
      disconnectListeners.forEach((l) => l(port))
    },
  }
}

describe('setupExtractMedia', () => {
  let connectListeners: ConnectListener[]

  beforeEach(() => {
    connectListeners = []
    vi.stubGlobal('chrome', {
      runtime: {
        onConnect: {
          addListener: vi.fn((cb: ConnectListener) =>
            connectListeners.push(cb)
          ),
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('runs cleanup when port disconnects while extractMedia is still awaiting', async () => {
    const cleanup = vi.fn()
    const { promise, resolve } = Promise.withResolvers<() => void>()
    mockExtractMedia.mockReturnValue(promise)

    setupExtractMedia()
    const fake = createFakePort(portNames.extractMedia, 42)
    connectListeners[0](fake.port)
    fake.emitMessage({
      action: 'extractMedia',
      data: { url: 'https://example.com' },
    })

    await Promise.resolve()
    fake.simulateDisconnect()

    resolve(cleanup)
    await vi.waitFor(() => {
      expect(cleanup).toHaveBeenCalledTimes(1)
    })
  })

  it('does not clobber cleanups across concurrent ports from the same tab', async () => {
    const cleanups = [vi.fn(), vi.fn()]
    let callIndex = 0
    mockExtractMedia.mockImplementation(async () => cleanups[callIndex++])

    setupExtractMedia()
    const handler = connectListeners[0]
    const portA = createFakePort(portNames.extractMedia, 42)
    const portB = createFakePort(portNames.extractMedia, 42)
    handler(portA.port)
    handler(portB.port)

    portA.emitMessage({
      action: 'extractMedia',
      data: { url: 'https://a.example' },
    })
    portB.emitMessage({
      action: 'extractMedia',
      data: { url: 'https://b.example' },
    })

    await vi.waitFor(() => {
      expect(mockExtractMedia).toHaveBeenCalledTimes(2)
    })

    portA.simulateDisconnect()
    expect(cleanups[0]).toHaveBeenCalledTimes(1)
    expect(cleanups[1]).not.toHaveBeenCalled()

    portB.simulateDisconnect()
    expect(cleanups[1]).toHaveBeenCalledTimes(1)
  })

  it('does not disconnect a port that is already disconnected on completion', async () => {
    let capturedOnComplete: (() => void) | undefined
    mockExtractMedia.mockImplementation(async (_url, opts) => {
      capturedOnComplete = opts.onComplete
      return () => {}
    })

    setupExtractMedia()
    const fake = createFakePort(portNames.extractMedia, 42)
    connectListeners[0](fake.port)
    fake.emitMessage({
      action: 'extractMedia',
      data: { url: 'https://example.com' },
    })

    await vi.waitFor(() => {
      expect(capturedOnComplete).toBeDefined()
    })

    fake.simulateDisconnect()
    expect(fake.port.disconnect).not.toHaveBeenCalled()

    capturedOnComplete?.()
    expect(fake.port.disconnect).not.toHaveBeenCalled()
  })
})
