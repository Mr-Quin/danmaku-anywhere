import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { OptionsManager } from './OptionsManager'

/**
 * OptionsManager starts the options upgrade on install, startup and every
 * worker wake, sharing one run between them. A wake over stores that are
 * already current writes nothing. A failed run is reported through readiness
 * and the next event starts a fresh attempt.
 */

describe('OptionsManager', () => {
  it('resumes an interrupted upgrade when the worker wakes without an install or startup event', async () => {
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })

    const container = createBackgroundContainer()
    container.get(OptionsManager).setup()

    const danmakuOptions = container.get(DanmakuOptionsService)
    await expect(danmakuOptions.get()).resolves.toBeDefined()
    expect(await danmakuOptions.options.getVersion()).toBe(
      danmakuOptions.options.latestVersion
    )
  })

  it('writes nothing on a wake when every store is current', async () => {
    const first = createBackgroundContainer()
    first.get(OptionsManager).setup()
    await first.get(ReadinessService).waitUntilReady()
    const syncSet = vi.spyOn(fakeBrowser.storage.sync, 'set')
    const localSet = vi.spyOn(fakeBrowser.storage.local, 'set')

    const second = createBackgroundContainer()
    second.get(OptionsManager).setup()
    await second.get(ReadinessService).waitUntilReady()
    await second.get(DanmakuOptionsService).get()

    expect(syncSet).not.toHaveBeenCalled()
    expect(localSet).not.toHaveBeenCalled()
  })

  it('runs one upgrade when install, startup and the wake all ask for it', async () => {
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })
    const container = createBackgroundContainer()
    const upgrade = vi.spyOn(
      container.get(DanmakuOptionsService).options,
      'upgrade'
    )

    container.get(OptionsManager).setup()
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'install',
    })
    await fakeBrowser.runtime.onStartup.trigger()
    await container.get(DanmakuOptionsService).get()

    expect(upgrade).toHaveBeenCalledTimes(1)
  })

  it('reports a failed upgrade and recovers on the next event', async () => {
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(
      new Error('QUOTA_BYTES quota exceeded')
    )
    const container = createBackgroundContainer()
    const readiness = container.get(ReadinessService)

    container.get(OptionsManager).setup()
    await vi.waitFor(() => {
      expect(readiness.getState()).toMatchObject({ status: 'failed' })
    })

    await fakeBrowser.runtime.onStartup.trigger()

    await expect(
      container.get(DanmakuOptionsService).get()
    ).resolves.toBeDefined()
    expect(readiness.getState()).toEqual({ status: 'ready' })
    await vi.waitFor(async () => {
      expect(
        await fakeBrowser.storage.local.get('optionsUpgradeFailure')
      ).toEqual({})
    })
  })
})
