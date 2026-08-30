import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { ProviderService } from '@/background/services/providers/ProviderService'
import { LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { AlarmManager } from './AlarmManager'

/**
 * AlarmManager owns the chrome.alarms lifecycle. Verifies that setup registers
 * the periodic manifest-refresh alarm and that, when only that alarm fires, the
 * handler delegates to ProviderService.syncCatalog (and ignores other alarms),
 * so the catalog stays current on a schedule.
 */

function firedAlarm(name: string) {
  return { name, scheduledTime: Date.now(), persistAcrossSessions: false }
}

describe('AlarmManager manifest refresh', () => {
  it('creates the refresh alarm and runs syncCatalog only when it fires', async () => {
    const syncCatalog = vi.fn(async () => {})
    const onChange = vi.fn<ExtensionOptionsService['onChange']>()
    const get = vi.fn(async () => ({
      retentionPolicy: { enabled: false, deleteCommentsAfter: 0 },
    }))

    const manager = createTestContainer(
      [backgroundContainerModule],
      [
        { identifier: DanmakuService, value: {} },
        { identifier: ExtensionOptionsService, value: { onChange, get } },
        { identifier: ProviderService, value: { syncCatalog } },
        { identifier: LoggerSymbol, value: silentLogger },
      ]
    ).get(AlarmManager)

    manager.setup()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(await fakeBrowser.alarms.get('refresh-manifests')).toMatchObject({
      periodInMinutes: expect.any(Number),
    })

    await fakeBrowser.alarms.onAlarm.trigger(firedAlarm('refresh-manifests'))
    expect(syncCatalog).toHaveBeenCalledTimes(1)

    syncCatalog.mockClear()
    await fakeBrowser.alarms.onAlarm.trigger(firedAlarm('some-other-alarm'))
    expect(syncCatalog).not.toHaveBeenCalled()
  })
})
