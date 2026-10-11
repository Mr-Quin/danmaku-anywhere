import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { EXTENSION_VERSION } from '@/common/constants'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { OptionsManager } from './OptionsManager'
import { UpgradeService } from './UpgradeService/UpgradeService'

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
    } as chrome.runtime.InstalledDetails)
    await fakeBrowser.runtime.onStartup.trigger()
    await container.get(DanmakuOptionsService).get()

    expect(upgrade).toHaveBeenCalledTimes(1)
  })
})
