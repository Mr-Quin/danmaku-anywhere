import { fakeBrowser } from '@webext-core/fake-browser'
import { Container } from 'inversify'
import { describe, expect, it, vi } from 'vitest'
import { EXTENSION_VERSION } from '@/common/constants'
import { LoggerSymbol } from '@/common/Logger'
import {
  type OptionStoreDescriptor,
  OptionStoreDescriptors,
} from '@/common/options/optionStores'
import { silentLogger } from '@/tests/silentLogger'
import { UPGRADE_RUN_KEY, type UpgradeRun } from '../upgrade/upgradeRun'
import { ReadinessService } from './ReadinessService'

/**
 * ReadinessService is ready once every option store is stored at its latest
 * version, whichever context wrote it. Until then it is failed while this
 * build has a failed upgrade recorded or a run of this build was cut off
 * mid-way, and pending otherwise, including while a run is in progress or the
 * only failure is from an earlier build. Waiters
 * keep waiting through a failure and resolve when a retry succeeds. Ready is final for the context and ends all storage
 * listening. Reading the state does not touch storage, each evaluation reads
 * each storage area once, and a failed read is retried on its own.
 */

const alpha: OptionStoreDescriptor = {
  key: 'alpha',
  area: 'sync',
  latestVersion: 2,
}
const beta: OptionStoreDescriptor = {
  key: 'beta',
  area: 'local',
  latestVersion: 2,
}

function createReadiness(stores = [alpha, beta]) {
  const container = new Container()
  container.bind(ReadinessService).toSelf().inSingletonScope()
  container.bind(LoggerSymbol).toConstantValue(silentLogger)
  container.bind(OptionStoreDescriptors).toConstantValue(stores)
  return container.get(ReadinessService)
}

function storeAt(store: OptionStoreDescriptor, version: number) {
  return fakeBrowser.storage[store.area].set({
    [store.key]: { data: { value: 'stored' }, version },
  })
}

function recordRun(run: UpgradeRun) {
  return fakeBrowser.storage.local.set({ [UPGRADE_RUN_KEY]: run })
}

const failedRun: UpgradeRun = {
  status: 'failed',
  build: EXTENSION_VERSION,
  attempts: 1,
  failedAt: 0,
  message: 'QUOTA_BYTES quota exceeded',
}

async function settledState(readiness: ReadinessService) {
  readiness.subscribe(() => undefined)
  await new Promise((resolve) => setTimeout(resolve, 0))
  return readiness.getState()
}

describe('ReadinessService', () => {
  it('is ready when every store is at its latest version', async () => {
    await storeAt(alpha, 2)
    await storeAt(beta, 3)
    const readiness = createReadiness()

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
    expect(readiness.getState()).toEqual({ status: 'ready' })
  })

  it('is pending while a store is behind and ready once it is upgraded', async () => {
    await storeAt(alpha, 2)
    await storeAt(beta, 1)
    const readiness = createReadiness()
    let isReady = false
    void readiness.waitUntilReady().then(() => {
      isReady = true
    })

    expect(await settledState(readiness)).toEqual({ status: 'pending' })
    expect(isReady).toBe(false)

    await storeAt(beta, 2)

    await vi.waitFor(() => {
      expect(isReady).toBe(true)
    })
  })

  it('is pending while a store has never been written', async () => {
    await storeAt(alpha, 2)
    const readiness = createReadiness()

    expect(await settledState(readiness)).toEqual({ status: 'pending' })
  })

  it('reports a failed run while a store is behind', async () => {
    await storeAt(alpha, 1)
    await recordRun(failedRun)
    const readiness = createReadiness([alpha])

    expect(await settledState(readiness)).toEqual({
      status: 'failed',
      message: 'QUOTA_BYTES quota exceeded',
    })
  })

  it('is pending again once a new run starts after a failure', async () => {
    await storeAt(alpha, 1)
    await recordRun(failedRun)
    const readiness = createReadiness([alpha])
    expect((await settledState(readiness)).status).toBe('failed')

    await recordRun({
      status: 'running',
      build: EXTENSION_VERSION,
      attempts: 2,
      startedAt: Date.now(),
    })

    await vi.waitFor(() => {
      expect(readiness.getState()).toEqual({ status: 'pending' })
    })
  })

  it('reports a run still marked running long after it started as failed', async () => {
    await storeAt(alpha, 1)
    await recordRun({
      status: 'running',
      build: EXTENSION_VERSION,
      attempts: 1,
      startedAt: 0,
    })
    const readiness = createReadiness([alpha])

    expect((await settledState(readiness)).status).toBe('failed')
  })

  it('stops reading once a cut-off run has been reported as failed', async () => {
    await storeAt(alpha, 1)
    await recordRun({
      status: 'running',
      build: EXTENSION_VERSION,
      attempts: 1,
      startedAt: 0,
    })
    const readiness = createReadiness([alpha])
    expect((await settledState(readiness)).status).toBe('failed')
    const localGet = vi.spyOn(fakeBrowser.storage.local, 'get')

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(localGet).not.toHaveBeenCalled()
  })

  it('reports a running run as failed once it goes stale, then stops reading', async () => {
    await storeAt(alpha, 1)
    const fiveMinutes = 5 * 60_000
    await recordRun({
      status: 'running',
      build: EXTENSION_VERSION,
      attempts: 1,
      startedAt: Date.now() - fiveMinutes + 100,
    })
    const readiness = createReadiness([alpha])
    expect((await settledState(readiness)).status).toBe('pending')

    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('failed')
    })
    const localGet = vi.spyOn(fakeBrowser.storage.local, 'get')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(localGet).not.toHaveBeenCalled()
  })

  it('stays pending when the only failure is from an earlier build', async () => {
    await storeAt(alpha, 1)
    await recordRun({ ...failedRun, build: '0.0.1' })
    const readiness = createReadiness([alpha])

    expect(await settledState(readiness)).toEqual({ status: 'pending' })
  })

  it('picks up a failure recorded by another context', async () => {
    await storeAt(alpha, 1)
    const readiness = createReadiness([alpha])
    expect(await settledState(readiness)).toEqual({ status: 'pending' })

    await recordRun(failedRun)

    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('failed')
    })
  })

  it('keeps waiters waiting through a failure until the stores are upgraded', async () => {
    await storeAt(alpha, 1)
    const readiness = createReadiness([alpha])
    let isReady = false
    void readiness.waitUntilReady().then(() => {
      isReady = true
    })

    await recordRun(failedRun)
    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('failed')
    })
    expect(isReady).toBe(false)

    await storeAt(alpha, 2)

    await vi.waitFor(() => {
      expect(isReady).toBe(true)
    })
  })

  it('is ready over a stale failure record once every store is current', async () => {
    await storeAt(alpha, 2)
    await recordRun(failedRun)

    const readiness = createReadiness([alpha])

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
  })

  it('stays ready and stops listening once ready', async () => {
    await storeAt(alpha, 2)
    const added = vi.spyOn(fakeBrowser.storage.sync.onChanged, 'addListener')
    const removed = vi.spyOn(
      fakeBrowser.storage.sync.onChanged,
      'removeListener'
    )
    const readiness = createReadiness([alpha])
    await readiness.waitUntilReady()

    await fakeBrowser.storage.sync.remove('alpha')
    await recordRun(failedRun)

    expect(await settledState(readiness)).toEqual({ status: 'ready' })
    expect(removed.mock.calls).toEqual(added.mock.calls)
  })

  it('notifies subscribers when the state changes and not after they leave', async () => {
    await storeAt(alpha, 1)
    const readiness = createReadiness([alpha])
    const seen: string[] = []
    const unsubscribe = readiness.subscribe(() => {
      seen.push(readiness.getState().status)
    })

    await recordRun(failedRun)
    await vi.waitFor(() => {
      expect(seen).toEqual(['failed'])
    })
    unsubscribe()
    await storeAt(alpha, 2)

    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('ready')
    })
    expect(seen).toEqual(['failed'])
  })

  it('does not read storage when only the state is asked for', async () => {
    const syncGet = vi.spyOn(fakeBrowser.storage.sync, 'get')
    const localGet = vi.spyOn(fakeBrowser.storage.local, 'get')
    const readiness = createReadiness()

    expect(readiness.getState()).toEqual({ status: 'pending' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(syncGet).not.toHaveBeenCalled()
    expect(localGet).not.toHaveBeenCalled()
  })

  it('reads each storage area once per evaluation', async () => {
    await storeAt(alpha, 2)
    await storeAt(beta, 2)
    const syncGet = vi.spyOn(fakeBrowser.storage.sync, 'get')
    const localGet = vi.spyOn(fakeBrowser.storage.local, 'get')

    await createReadiness().waitUntilReady()

    expect(syncGet).toHaveBeenCalledTimes(1)
    expect(localGet).toHaveBeenCalledTimes(1)
  })

  it('reads again after a failed read without waiting for a change', async () => {
    await storeAt(alpha, 2)
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValueOnce(
      new Error('IO error')
    )
    const readiness = createReadiness([alpha])

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
  })
})
