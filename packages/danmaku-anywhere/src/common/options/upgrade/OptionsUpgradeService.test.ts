import { fakeBrowser } from '@webext-core/fake-browser'
import { Container } from 'inversify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
  UpgradableOptionStores,
} from '@/common/options/IStoreService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { StoreSnapshot } from '@/common/options/OptionsService/types'
import { OptionStoreDescriptors } from '@/common/options/optionStores'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { OptionsUpgradeService } from './OptionsUpgradeService'
import {
  UPGRADE_RUN_KEY,
  UPGRADE_SNAPSHOT_KEY,
  type UpgradeRun,
} from './upgradeRun'

/**
 * OptionsUpgradeService runs the upgrade of every option store. Concurrent
 * requests share one run. A run is recorded as running while it is in flight,
 * as failed with its attempt count when it fails, and the record is removed
 * when it succeeds. ensureUpgraded checks storage, not this context's
 * readiness: it skips current stores and a failed run whose retry delay has
 * not passed. upgrade always runs.
 */

interface Counter {
  count: number
}

const MINUTE = 60_000

// Stores named in bumped get a version 3, standing for a later release that
// adds a step reading the other stores.
function setup(keys: string[], bumped: string[] = []) {
  const migrations: Record<string, number> = {}
  const seenStores: StoreSnapshot[] = []
  const container = new Container({ defaultScope: 'Singleton' })
  container.bind(LoggerSymbol).toConstantValue(silentLogger)
  container.bind(ReadinessService).toSelf()
  container.bind(OptionsUpgradeService).toSelf()
  const descriptors = keys.map((key) => {
    const latestVersion = bumped.includes(key) ? 3 : 2
    return { key, area: 'local', latestVersion } as const
  })
  container.bind(OptionStoreDescriptors).toConstantValue(descriptors)
  for (const descriptor of descriptors) {
    const { key } = descriptor
    migrations[key] = 0
    const options = new OptionsService<Counter>(
      { waitUntilReady: () => Promise.resolve() },
      key,
      { count: 0 },
      silentLogger,
      'local'
    )
      .version(1, { upgrade: (data) => data })
      .version(2, {
        upgrade: (data: Counter) => {
          migrations[key] += 1
          return { count: data.count + 1 }
        },
      })
    if (descriptor.latestVersion === 3) {
      options.version(3, {
        upgrade: (data: Counter, context) => {
          seenStores.push(context.stores)
          return data
        },
      })
    }
    container
      .bind<IStoreService>(StoreServiceSymbol)
      .toConstantValue({ name: key, descriptor, options })
  }
  container.bind(UpgradableOptionStores).toDynamicValue((context) => {
    return context.getAll<IStoreService>(StoreServiceSymbol)
  })
  return {
    upgrader: container.get(OptionsUpgradeService),
    readiness: container.get(ReadinessService),
    migrations,
    seenStores,
  }
}

function storeV1(key: string, count: number) {
  return fakeBrowser.storage.local.set({
    [key]: { data: { count }, version: 1 },
  })
}

async function readRaw(key: string) {
  const stored = await fakeBrowser.storage.local.get(key)
  return stored[key]
}

function failWritesTo(key: string) {
  const set = fakeBrowser.storage.local.set.bind(fakeBrowser.storage.local)
  return vi
    .spyOn(fakeBrowser.storage.local, 'set')
    .mockImplementation(async (items) => {
      if (key in items) {
        throw new Error('QUOTA_BYTES quota exceeded')
      }
      return set(items)
    })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('OptionsUpgradeService', () => {
  it('upgrades every store and makes readiness ready', async () => {
    await storeV1('alpha', 1)
    await storeV1('beta', 5)
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: '1.5.0' },
    })
    const { upgrader, readiness } = setup(['alpha', 'beta'])

    await upgrader.ensureUpgraded()

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
    expect(await readRaw('alpha')).toEqual({ data: { count: 2 }, version: 2 })
    expect(await readRaw('beta')).toEqual({ data: { count: 6 }, version: 2 })
    expect(await readRaw(UPGRADE_RUN_KEY)).toBeUndefined()
    expect(await readRaw('lastVersion')).toBeUndefined()
  })

  it('shares one run between requests made while it is in flight', async () => {
    await storeV1('alpha', 1)
    const { upgrader, migrations } = setup(['alpha'])

    await Promise.all([
      upgrader.upgrade(),
      upgrader.ensureUpgraded(),
      upgrader.upgrade(),
    ])

    expect(migrations.alpha).toBe(1)
  })

  it('records the run as running while it is in flight', async () => {
    await storeV1('alpha', 1)
    const { upgrader } = setup(['alpha'])
    let runAtWrite: unknown
    const set = fakeBrowser.storage.local.set.bind(fakeBrowser.storage.local)
    vi.spyOn(fakeBrowser.storage.local, 'set').mockImplementation(
      async (items) => {
        if ('alpha' in items) {
          runAtWrite = await readRaw(UPGRADE_RUN_KEY)
        }
        return set(items)
      }
    )

    await upgrader.upgrade()

    expect(runAtWrite).toMatchObject({ status: 'running', attempts: 1 })
  })

  it('records a failed run that readiness reports, keeping the store as it was', async () => {
    await storeV1('alpha', 1)
    await storeV1('beta', 5)
    failWritesTo('beta')
    const { upgrader, readiness } = setup(['alpha', 'beta'])

    await expect(upgrader.upgrade()).rejects.toThrow(/beta/)

    expect(await readRaw(UPGRADE_RUN_KEY)).toMatchObject({
      status: 'failed',
      attempts: 1,
      message: 'Failed to upgrade options: beta',
    })
    readiness.subscribe(() => undefined)
    await vi.waitFor(() => {
      expect(readiness.getState()).toMatchObject({ status: 'failed' })
    })
    expect(await readRaw('beta')).toEqual({ data: { count: 5 }, version: 1 })
  })

  it('counts attempts across failed runs and clears the record on success', async () => {
    await storeV1('alpha', 1)
    const failing = failWritesTo('alpha')
    const { upgrader } = setup(['alpha'])
    await expect(upgrader.upgrade()).rejects.toThrow()
    await expect(upgrader.upgrade()).rejects.toThrow()
    expect(await readRaw(UPGRADE_RUN_KEY)).toMatchObject({ attempts: 2 })
    failing.mockRestore()

    await upgrader.upgrade()

    expect(await readRaw(UPGRADE_RUN_KEY)).toBeUndefined()
    expect(await readRaw('alpha')).toEqual({ data: { count: 2 }, version: 2 })
  })

  it('does nothing on ensureUpgraded when every store is current', async () => {
    await fakeBrowser.storage.local.set({
      alpha: { data: { count: 1 }, version: 2 },
    })
    const { upgrader } = setup(['alpha'])
    const set = vi.spyOn(fakeBrowser.storage.local, 'set')

    await upgrader.ensureUpgraded()

    expect(set).not.toHaveBeenCalled()
  })

  it('upgrades on ensureUpgraded a store that went missing after readiness was ready', async () => {
    await fakeBrowser.storage.local.set({
      alpha: { data: { count: 1 }, version: 2 },
    })
    const { upgrader, readiness } = setup(['alpha'])
    await readiness.waitUntilReady()
    await fakeBrowser.storage.local.remove('alpha')

    await upgrader.ensureUpgraded()

    expect(await readRaw('alpha')).toEqual({ data: { count: 0 }, version: 2 })
  })

  it('waits out the retry delay after a failure on ensureUpgraded', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(0)
    await storeV1('alpha', 1)
    const failing = failWritesTo('alpha')
    const { upgrader, migrations } = setup(['alpha'])
    await expect(upgrader.ensureUpgraded()).rejects.toThrow()
    failing.mockRestore()

    const { failedAt } = (await readRaw(UPGRADE_RUN_KEY)) as Extract<
      UpgradeRun,
      { status: 'failed' }
    >

    vi.setSystemTime(failedAt + MINUTE - 1)
    await upgrader.ensureUpgraded()
    expect(migrations.alpha).toBe(1)

    vi.setSystemTime(failedAt + MINUTE)
    await upgrader.ensureUpgraded()
    expect(migrations.alpha).toBe(2)
    expect(await readRaw('alpha')).toEqual({ data: { count: 2 }, version: 2 })
  })

  it('runs on upgrade even inside the retry delay', async () => {
    await storeV1('alpha', 1)
    const failing = failWritesTo('alpha')
    const { upgrader } = setup(['alpha'])
    await expect(upgrader.upgrade()).rejects.toThrow()
    failing.mockRestore()

    await upgrader.upgrade()

    expect(await readRaw('alpha')).toEqual({ data: { count: 2 }, version: 2 })
  })

  it('starts counting attempts again for a new build', async () => {
    await storeV1('alpha', 1)
    failWritesTo('alpha')
    const { upgrader } = setup(['alpha'])
    await expect(upgrader.upgrade()).rejects.toThrow()
    await expect(upgrader.upgrade()).rejects.toThrow()

    await expect(upgrader.upgradeForNewBuild()).rejects.toThrow()

    expect(await readRaw(UPGRADE_RUN_KEY)).toMatchObject({ attempts: 1 })
  })

  it('removes the snapshot and the run record in one call on success', async () => {
    await storeV1('alpha', 1)
    const { upgrader } = setup(['alpha'])
    const remove = vi.spyOn(fakeBrowser.storage.local, 'remove')

    await upgrader.upgrade()

    expect(remove).toHaveBeenCalledWith(
      expect.arrayContaining([UPGRADE_RUN_KEY, UPGRADE_SNAPSHOT_KEY])
    )
    expect(await readRaw(UPGRADE_SNAPSHOT_KEY)).toBeUndefined()
  })

  it('does not reuse a snapshot that no run record vouches for', async () => {
    await storeV1('alpha', 1)
    await fakeBrowser.storage.local.set({
      beta: { data: { count: 5 }, version: 2 },
      [UPGRADE_SNAPSHOT_KEY]: {
        alpha: { data: { count: 1 }, version: 1 },
        beta: { data: { count: 0 }, version: 2 },
      },
    })
    const { upgrader, seenStores } = setup(['alpha', 'beta'], ['alpha', 'beta'])

    await upgrader.upgrade()

    expect(seenStores.at(-1)).toMatchObject({ beta: { count: 5 } })
  })

  it('does not hand a later release the snapshot of an earlier successful run', async () => {
    await storeV1('alpha', 1)
    await fakeBrowser.storage.local.set({
      beta: { data: { count: 5 }, version: 2 },
    })
    vi.spyOn(fakeBrowser.storage.local, 'remove').mockRejectedValueOnce(
      new Error('IO error')
    )
    const release = setup(['alpha', 'beta'])
    await release.upgrader.upgrade()
    expect(await readRaw(UPGRADE_SNAPSHOT_KEY)).toBeDefined()

    await release.upgrader.ensureUpgraded()
    const next = setup(['alpha', 'beta'], ['beta'])
    await next.upgrader.upgradeForNewBuild()

    expect(next.seenStores.at(-1)).toEqual({
      alpha: { count: 2 },
      beta: { count: 5 },
    })
  })
})
