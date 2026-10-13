import { fakeBrowser } from '@webext-core/fake-browser'
import { Container } from 'inversify'
import { describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import {
  type IOptionStoresProvider,
  type IStoreService,
  OptionStoresProvider,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { OptionsUpgradeService } from './OptionsUpgradeService'

/**
 * OptionsUpgradeService runs the upgrade of every option store. Concurrent
 * requests share one run. A failed run leaves a failure record that readiness
 * reports, and the next request starts a fresh run, which clears the record
 * when it succeeds. ensureUpgraded skips the run once readiness is ready;
 * upgrade always runs.
 */

interface Counter {
  count: number
}

function setup(keys: string[]) {
  const migrations: Record<string, number> = {}
  const container = new Container({ defaultScope: 'Singleton' })
  container.bind(LoggerSymbol).toConstantValue(silentLogger)
  container.bind(ReadinessService).toSelf()
  container.bind(OptionsUpgradeService).toSelf()
  for (const key of keys) {
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
    container
      .bind<IStoreService>(StoreServiceSymbol)
      .toConstantValue({ name: key, options })
  }
  container
    .bind<IOptionStoresProvider>(OptionStoresProvider)
    .toFactory((context) => {
      return () => context.getAll<IStoreService>(StoreServiceSymbol)
    })
  return {
    upgrader: container.get(OptionsUpgradeService),
    readiness: container.get(ReadinessService),
    migrations,
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

describe('OptionsUpgradeService', () => {
  it('upgrades every store and makes readiness ready', async () => {
    await storeV1('alpha', 1)
    await storeV1('beta', 5)
    const { upgrader, readiness } = setup(['alpha', 'beta'])

    await upgrader.ensureUpgraded()

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
    expect(await readRaw('alpha')).toEqual({ data: { count: 2 }, version: 2 })
    expect(await readRaw('beta')).toEqual({ data: { count: 6 }, version: 2 })
  })

  it('shares one run between requests made while it is in flight', async () => {
    await storeV1('alpha', 1)
    const { upgrader, migrations } = setup(['alpha'])

    await Promise.all([
      upgrader.ensureUpgraded(),
      upgrader.upgrade(),
      upgrader.ensureUpgraded(),
    ])

    expect(migrations.alpha).toBe(1)
  })

  it('reports a failed run through readiness and keeps the store as it was', async () => {
    await storeV1('alpha', 1)
    await storeV1('beta', 5)
    failWritesTo('beta')
    const { upgrader, readiness } = setup(['alpha', 'beta'])

    await expect(upgrader.ensureUpgraded()).rejects.toThrow(/beta/)

    await vi.waitFor(() => {
      expect(readiness.getState()).toMatchObject({ status: 'failed' })
    })
    expect(await readRaw('beta')).toEqual({ data: { count: 5 }, version: 1 })
  })

  it('runs again on the next request after a failure and clears the record', async () => {
    await storeV1('alpha', 1)
    const failing = failWritesTo('alpha')
    const { upgrader, readiness } = setup(['alpha'])
    await expect(upgrader.ensureUpgraded()).rejects.toThrow()
    failing.mockRestore()

    await upgrader.upgrade()

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
    expect(await readRaw('optionsUpgradeFailure')).toBeUndefined()
  })

  it('skips the run on ensureUpgraded once readiness is ready', async () => {
    await fakeBrowser.storage.local.set({
      alpha: { data: { count: 1 }, version: 2 },
    })
    const { upgrader, readiness } = setup(['alpha'])
    await readiness.waitUntilReady()
    await fakeBrowser.storage.local.remove('alpha')

    await upgrader.ensureUpgraded()

    expect(await readRaw('alpha')).toBeUndefined()
  })

  it('runs on upgrade even once readiness is ready', async () => {
    await fakeBrowser.storage.local.set({
      alpha: { data: { count: 1 }, version: 2 },
    })
    const { upgrader, readiness } = setup(['alpha'])
    await readiness.waitUntilReady()
    await fakeBrowser.storage.local.remove('alpha')

    await upgrader.upgrade()

    expect(await readRaw('alpha')).toEqual({ data: { count: 0 }, version: 2 })
  })
})
