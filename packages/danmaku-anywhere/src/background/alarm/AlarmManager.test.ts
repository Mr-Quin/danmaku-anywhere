import { describe, expect, it, vi } from 'vitest'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { dispatchFakeAlarm } from '@/tests/fakes/fakeChrome'
import { mockChrome } from '@/tests/mockChromeApis'
import { silentLogger } from '@/tests/silentLogger'
import { AlarmManager } from './AlarmManager'

/**
 * AlarmManager owns the chrome.alarms lifecycle. Verifies that setup registers
 * the periodic manifest-refresh alarm and that, when only that alarm fires, the
 * handler delegates to ProviderService.syncCatalog (and ignores other alarms),
 * so the catalog stays current on a schedule.
 */

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

    const manager = new AlarmManager(
      {} as unknown as DanmakuService,
      extensionOptionsService,
      providerService,
      silentLogger
    )

    manager.setup()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockChrome.alarms.create).toHaveBeenCalledWith(
      'refresh-manifests',
      expect.objectContaining({ periodInMinutes: expect.any(Number) })
    )

    await dispatchFakeAlarm({
      name: 'refresh-manifests',
    } as chrome.alarms.Alarm)
    expect(syncCatalog).toHaveBeenCalledTimes(1)

    syncCatalog.mockClear()
    await dispatchFakeAlarm({ name: 'some-other-alarm' } as chrome.alarms.Alarm)
    expect(syncCatalog).not.toHaveBeenCalled()
  })
})
