import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DA_ENV, EXTENSION_VERSION } from '@/common/constants'
import type { ILogger } from '@/common/Logger'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { TelemetryManager } from './TelemetryManager'

/**
 * TelemetryManager buffers relayed events in the background and flushes them to
 * the intake endpoint. Verifies the size trigger (20 events), the 30s timer
 * trigger, the consent gate (drops everything when analytics is off or no
 * install id), and drop-on-failure (a failed flush never throws and the batch
 * is not retried).
 */

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

const makeOptionsService = (options: {
  enableAnalytics: boolean
  id?: string
}) => {
  return {
    get: vi.fn(async () => options),
    onChange: vi.fn(),
  } as unknown as ExtensionOptionsService
}

const makeManager = async (options: {
  enableAnalytics: boolean
  id?: string
}) => {
  const manager = new TelemetryManager(
    makeOptionsService(options),
    silentLogger
  )
  await manager.setup()
  return manager
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchSpy = vi.fn(async () => new Response('{}', { status: 202 }))
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('TelemetryManager', () => {
  it('flushes once the buffer reaches the size threshold', async () => {
    const manager = await makeManager({
      enableAnalytics: true,
      id: 'install-1',
    })

    for (let i = 0; i < 20; i++) {
      manager.track('search', { keyword: 'x' }, 'popup', 1700000000000)
    }
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    const [, init] = fetchSpy.mock.calls[0]
    const batch = JSON.parse(init.body)
    expect(batch).toHaveLength(20)
    expect(batch[0]).toMatchObject({
      installId: 'install-1',
      event: 'search',
      surface: 'popup',
      version: EXTENSION_VERSION,
      environment: DA_ENV,
    })
    expect(batch[0].properties).toEqual({ keyword: 'x' })
  })

  it('does not schedule a second flush after a size-triggered flush', async () => {
    vi.useFakeTimers()
    const manager = await makeManager({
      enableAnalytics: true,
      id: 'install-1',
    })

    for (let i = 0; i < 20; i++) {
      manager.track('search', { keyword: 'x' }, 'popup', 1)
    }
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('flushes background-origin events immediately', async () => {
    const manager = await makeManager({
      enableAnalytics: true,
      id: 'install-1',
    })

    manager.track('heartbeat', { browser: 'chrome' }, 'background', 1)
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
  })

  it('flushes a partial buffer after the timer elapses', async () => {
    vi.useFakeTimers()
    const manager = await makeManager({
      enableAnalytics: true,
      id: 'install-1',
    })

    manager.track('search', { keyword: 'x' }, 'popup', 1)
    expect(fetchSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('drops events when consent is disabled', async () => {
    const manager = await makeManager({
      enableAnalytics: false,
      id: 'install-1',
    })

    for (let i = 0; i < 25; i++) {
      manager.track('search', { keyword: 'x' }, 'popup', 1)
    }
    await Promise.resolve()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('drops events when there is no install id', async () => {
    const manager = await makeManager({ enableAnalytics: true, id: undefined })

    for (let i = 0; i < 25; i++) {
      manager.track('search', { keyword: 'x' }, 'popup', 1)
    }
    await Promise.resolve()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not retry a failed flush', async () => {
    fetchSpy.mockRejectedValue(new Error('offline'))
    const manager = await makeManager({
      enableAnalytics: true,
      id: 'install-1',
    })

    for (let i = 0; i < 20; i++) {
      manager.track('search', { keyword: 'first' }, 'popup', 1)
    }
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    fetchSpy.mockResolvedValue(new Response('{}', { status: 202 }))
    for (let i = 0; i < 20; i++) {
      manager.track('search', { keyword: 'second' }, 'popup', 1)
    }
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))

    const secondBatch = JSON.parse(fetchSpy.mock.calls[1][1].body)
    expect(secondBatch).toHaveLength(20)
    expect(
      secondBatch.every(
        (e: { properties: { keyword: string } }) =>
          e.properties.keyword === 'second'
      )
    ).toBe(true)
  })
})
