import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import type { TelemetryManager } from '@/background/telemetry/TelemetryManager'
import type { ILogger } from '@/common/Logger'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { mockChrome } from '@/tests/mockChromeApis'
import { AlarmManager } from './AlarmManager'

/**
 * AlarmManager owns the chrome.alarms lifecycle. Verifies that setup registers
 * the periodic manifest-refresh alarm and that, when only that alarm fires, the
 * handler delegates to ProviderService.syncCatalog (and ignores other alarms),
 * so the catalog stays current on a schedule.
 */

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AlarmManager manifest refresh', () => {
  it('creates the refresh alarm and runs syncCatalog only when it fires', async () => {
    const syncCatalog = vi.fn(async () => {})
    const providerService = { syncCatalog } as unknown as ProviderService
    const extensionOptionsService = {
      onChange: vi.fn(),
      get: vi.fn(async () => ({
        retentionPolicy: { enabled: false, deleteCommentsAfter: 0 },
      })),
    } as unknown as ExtensionOptionsService

    const handlers: ((alarm: chrome.alarms.Alarm) => unknown)[] = []
    mockChrome.alarms.onAlarm.addListener.mockImplementation((h) =>
      handlers.push(h)
    )
    mockChrome.alarms.get.mockResolvedValue(undefined)

    const telemetryManager = {
      track: vi.fn(),
    } as unknown as TelemetryManager

    const manager = new AlarmManager(
      {} as unknown as DanmakuService,
      extensionOptionsService,
      providerService,
      telemetryManager,
      silentLogger
    )

    manager.setup()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockChrome.alarms.create).toHaveBeenCalledWith(
      'refresh-manifests',
      expect.objectContaining({ periodInMinutes: expect.any(Number) })
    )

    for (const handle of handlers) {
      await handle({ name: 'refresh-manifests' } as chrome.alarms.Alarm)
    }
    expect(syncCatalog).toHaveBeenCalledTimes(1)

    syncCatalog.mockClear()
    for (const handle of handlers) {
      await handle({ name: 'some-other-alarm' } as chrome.alarms.Alarm)
    }
    expect(syncCatalog).not.toHaveBeenCalled()
  })
})

describe('AlarmManager heartbeat', () => {
  it('creates the heartbeat alarm and emits a heartbeat event when it fires', async () => {
    const extensionOptionsService = {
      onChange: vi.fn(),
      get: vi.fn(async () => ({
        retentionPolicy: { enabled: false, deleteCommentsAfter: 0 },
      })),
    } as unknown as ExtensionOptionsService

    const track = vi.fn()
    const telemetryManager = { track } as unknown as TelemetryManager

    const handlers: ((alarm: chrome.alarms.Alarm) => unknown)[] = []
    mockChrome.alarms.onAlarm.addListener.mockImplementation((h) =>
      handlers.push(h)
    )
    mockChrome.alarms.get.mockResolvedValue(undefined)

    const manager = new AlarmManager(
      {} as unknown as DanmakuService,
      extensionOptionsService,
      {} as unknown as ProviderService,
      telemetryManager,
      silentLogger
    )

    manager.setup()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockChrome.alarms.create).toHaveBeenCalledWith(
      'heartbeat',
      expect.objectContaining({ periodInMinutes: expect.any(Number) })
    )

    for (const handle of handlers) {
      await handle({ name: 'heartbeat' } as chrome.alarms.Alarm)
    }
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith(
      'heartbeat',
      expect.objectContaining({ browser: expect.any(String) }),
      'background',
      expect.any(Number)
    )

    track.mockClear()
    for (const handle of handlers) {
      await handle({ name: 'some-other-alarm' } as chrome.alarms.Alarm)
    }
    expect(track).not.toHaveBeenCalled()
  })
})
