import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { OptionsManager } from './OptionsManager'

/**
 * OptionsManager starts the options upgrade on install, startup and every
 * worker wake, sharing one run between them. A wake over stores that are
 * already current writes nothing. A failed run is reported through readiness;
 * startup and wakes retry it only after the retry delay, while an install or
 * update retries at once. An update's release notes are shown once the
 * upgrade gets through, even in a later worker.
 */

afterEach(() => {
  vi.useRealTimers()
})

// Drops every listener the worker registered, the way Chrome does when it
// stops a worker, and keeps what it stored.
async function stopWorker() {
  const local = await fakeBrowser.storage.local.get(null)
  const sync = await fakeBrowser.storage.sync.get(null)
  fakeBrowser.reset()
  await fakeBrowser.storage.local.set(local)
  await fakeBrowser.storage.sync.set(sync)
}

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

  it('reports a failed upgrade and retries on startup once the delay has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(0)
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(
      new Error('QUOTA_BYTES quota exceeded')
    )
    const container = createBackgroundContainer()
    const readiness = container.get(ReadinessService)
    const danmakuOptions = container.get(DanmakuOptionsService)
    readiness.subscribe(() => undefined)

    container.get(OptionsManager).setup()
    await vi.waitFor(() => {
      expect(readiness.getState()).toMatchObject({ status: 'failed' })
    })

    await fakeBrowser.runtime.onStartup.trigger()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(readiness.getState()).toMatchObject({ status: 'failed' })

    vi.setSystemTime(10 * 60_000)
    await fakeBrowser.runtime.onStartup.trigger()

    await expect(danmakuOptions.get()).resolves.toBeDefined()
    expect(readiness.getState()).toEqual({ status: 'ready' })
  })

  it('retries a failed upgrade at once when the extension is updated', async () => {
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(
      new Error('QUOTA_BYTES quota exceeded')
    )
    const container = createBackgroundContainer()
    const readiness = container.get(ReadinessService)
    readiness.subscribe(() => undefined)

    container.get(OptionsManager).setup()
    await vi.waitFor(() => {
      expect(readiness.getState()).toMatchObject({ status: 'failed' })
    })
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'update',
      previousVersion: '1.5.0',
    })

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
  })

  it('shows the release notes of an update once a later worker gets the upgrade through', async () => {
    vi.stubEnv('DEV', false)
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(
      new Error('QUOTA_BYTES quota exceeded')
    )
    const first = createBackgroundContainer()
    const firstReadiness = first.get(ReadinessService)
    firstReadiness.subscribe(() => undefined)
    first.get(OptionsManager).setup()
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'update',
      previousVersion: '1.5.0',
    })
    await vi.waitFor(() => {
      expect(firstReadiness.getState()).toMatchObject({ status: 'failed' })
    })

    await stopWorker()
    await stopWorker()
    const second = createBackgroundContainer()
    second.get(OptionsManager).setup()
    await second.get(OptionsUpgradeService).upgrade()

    await vi.waitFor(async () => {
      expect(await second.get(ExtensionOptionsService).get()).toMatchObject({
        showReleaseNotes: true,
      })
    })
    vi.unstubAllEnvs()
  })
})
