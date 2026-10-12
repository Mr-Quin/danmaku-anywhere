import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { EXTENSION_VERSION } from '@/common/constants'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { OptionsManager } from './OptionsManager'
import { UpgradeService } from './UpgradeService/UpgradeService'

/**
 * OptionsManager starts the options upgrade on install, startup and on a worker
 * wake with a stale version marker, sharing one run between them. A failed run
 * is not remembered, so the next event starts a fresh attempt, and a version
 * marker that cannot be read leads to an upgrade attempt rather than a reset.
 */

describe('OptionsManager', () => {
  it('resumes an interrupted upgrade when the worker wakes without an install or startup event', async () => {
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: '0.0.1' },
    })
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })

    const container = createBackgroundContainer()
    container.get(OptionsManager).setup()

    const danmakuOptions = container.get(DanmakuOptionsService)
    await expect(danmakuOptions.get()).resolves.toBeDefined()
    expect(await danmakuOptions.options.getVersion()).toBeGreaterThan(1)
    expect(await fakeBrowser.storage.local.get('lastVersion')).toEqual({
      lastVersion: { lastVersion: EXTENSION_VERSION },
    })
  })

  it('skips the upgrade on a wake when the stored version is current', async () => {
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: EXTENSION_VERSION },
    })
    const container = createBackgroundContainer()
    const upgrade = vi.spyOn(container.get(UpgradeService), 'upgrade')

    container.get(OptionsManager).setup()
    await expect(
      container.get(DanmakuOptionsService).get()
    ).resolves.toBeDefined()

    expect(upgrade).not.toHaveBeenCalled()
  })

  it('runs one upgrade when install, startup and the wake all ask for it', async () => {
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: '0.0.1' },
    })
    const container = createBackgroundContainer()
    const upgrade = vi.spyOn(container.get(UpgradeService), 'upgrade')

    container.get(OptionsManager).setup()
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'install',
    })
    await fakeBrowser.runtime.onStartup.trigger()
    await container.get(DanmakuOptionsService).get()

    expect(upgrade).toHaveBeenCalledTimes(1)
  })

  it('retries on the next event after a failed upgrade instead of reusing the failure', async () => {
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: '0.0.1' },
    })
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(
      new Error('QUOTA_BYTES quota exceeded')
    )
    const container = createBackgroundContainer()
    const upgrade = vi.spyOn(container.get(UpgradeService), 'upgrade')

    container.get(OptionsManager).setup()
    await vi.waitFor(() => {
      expect(upgrade).toHaveBeenCalledTimes(1)
    })
    await expect(upgrade.mock.results[0].value).rejects.toThrow()
    expect(await fakeBrowser.storage.local.get('lastVersion')).toEqual({
      lastVersion: { lastVersion: '0.0.1' },
    })

    await fakeBrowser.runtime.onStartup.trigger()
    await container.get(DanmakuOptionsService).get()

    expect(upgrade).toHaveBeenCalledTimes(2)
    expect(await fakeBrowser.storage.local.get('lastVersion')).toEqual({
      lastVersion: { lastVersion: EXTENSION_VERSION },
    })
  })

  it('upgrades without resetting stored options when the version marker cannot be read', async () => {
    const custom = { ...defaultDanmakuOptions, trackHeight: 48 }
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: EXTENSION_VERSION },
    })
    const container = createBackgroundContainer()
    const danmakuOptions = container.get(DanmakuOptionsService)
    await fakeBrowser.storage.sync.set({
      danmakuOptions: {
        data: custom,
        version: danmakuOptions.options.latestVersion,
      },
    })
    vi.spyOn(
      container.get(ReadinessService),
      'isCurrentVersion'
    ).mockRejectedValueOnce(new Error('IO error'))
    const upgrade = vi.spyOn(container.get(UpgradeService), 'upgrade')

    container.get(OptionsManager).setup()
    await vi.waitFor(() => {
      expect(upgrade).toHaveBeenCalledTimes(1)
    })
    await upgrade.mock.results[0].value

    expect(await danmakuOptions.get()).toEqual(custom)
  })
})
