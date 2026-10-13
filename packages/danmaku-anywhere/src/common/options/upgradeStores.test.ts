import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { silentLogger } from '@/tests/silentLogger'
import type { IStoreService } from './IStoreService'
import { OptionsService } from './OptionsService/OptionsService'
import type { StoreSnapshot } from './OptionsService/types'
import { upgradeStores } from './upgradeStores'

/**
 * upgradeStores migrates every store with a snapshot of all stored data taken
 * before any store is written. The snapshot is kept in storage.local until an
 * attempt succeeds, so a retry after a partial upgrade still hands every step
 * the data from before the first attempt. A store that fails does not stop
 * the others, and the call then rejects naming each failed store. A read
 * error while taking the snapshot rejects before anything is written.
 */

interface Value {
  value: string
}

function createStore(key: string, onMigrate?: (stores: StoreSnapshot) => void) {
  const options = new OptionsService<Value>(
    { waitUntilReady: () => Promise.resolve() },
    key,
    { value: 'default' },
    silentLogger,
    'local'
  )
    .version(1, { upgrade: (data) => data })
    .version(2, {
      upgrade: (data: Value, context) => {
        onMigrate?.(context.stores)
        return { value: `${data.value} upgraded` }
      },
    })
  return {
    name: key,
    descriptor: { key, area: 'local', latestVersion: 2 },
    options,
  } satisfies IStoreService
}

function storeV1(key: string, value: string) {
  return fakeBrowser.storage.local.set({
    [key]: { data: { value }, version: 1 },
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

describe('upgradeStores', () => {
  it('gives each migration the data every store had before the upgrade', async () => {
    await storeV1('alpha', 'a')
    await storeV1('beta', 'b')
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('alpha'),
      createStore('beta', (snapshot) => seen.push(snapshot)),
    ]

    await upgradeStores(stores, silentLogger)

    expect(seen).toEqual([{ alpha: { value: 'a' }, beta: { value: 'b' } }])
  })

  it('leaves an absent store out of the snapshot and writes its defaults', async () => {
    await storeV1('beta', 'b')
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('alpha'),
      createStore('beta', (snapshot) => seen.push(snapshot)),
    ]

    await upgradeStores(stores, silentLogger)

    expect(seen).toEqual([{ beta: { value: 'b' } }])
    expect(await readRaw('alpha')).toEqual({
      data: { value: 'default' },
      version: 2,
    })
  })

  it('upgrades the other stores and names the one that failed', async () => {
    await storeV1('alpha', 'a')
    await storeV1('beta', 'b')
    failWritesTo('alpha')

    await expect(
      upgradeStores([createStore('alpha'), createStore('beta')], silentLogger)
    ).rejects.toThrow(/alpha/)

    expect(await readRaw('alpha')).toEqual({ data: { value: 'a' }, version: 1 })
    expect(await readRaw('beta')).toEqual({
      data: { value: 'b upgraded' },
      version: 2,
    })
  })

  it('hands a retry the data from before the first attempt', async () => {
    await storeV1('alpha', 'a')
    await storeV1('beta', 'b')
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('alpha'),
      createStore('beta', (snapshot) => seen.push(snapshot)),
    ]
    const failing = failWritesTo('beta')
    await expect(upgradeStores(stores, silentLogger)).rejects.toThrow(/beta/)
    expect(await readRaw('alpha')).toMatchObject({ version: 2 })
    failing.mockRestore()

    await upgradeStores(stores, silentLogger)

    expect(seen.at(-1)).toEqual({ alpha: { value: 'a' }, beta: { value: 'b' } })
    expect(await readRaw('optionsUpgradeSnapshot')).toBeUndefined()
  })

  it('keeps the snapshot with store versions until an attempt succeeds', async () => {
    await storeV1('alpha', 'a')
    failWritesTo('alpha')

    await expect(
      upgradeStores([createStore('alpha')], silentLogger)
    ).rejects.toThrow()

    expect(await readRaw('optionsUpgradeSnapshot')).toEqual({
      alpha: { data: { value: 'a' }, version: 1 },
    })
  })

  it('writes no snapshot when every store is already current', async () => {
    await fakeBrowser.storage.local.set({
      alpha: { data: { value: 'a' }, version: 2 },
    })
    const set = vi.spyOn(fakeBrowser.storage.local, 'set')

    await upgradeStores([createStore('alpha')], silentLogger)

    expect(set).not.toHaveBeenCalled()
  })

  it('rejects before writing when a store cannot be read', async () => {
    await storeV1('alpha', 'a')
    vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValueOnce(
      new Error('IO error')
    )

    await expect(
      upgradeStores([createStore('alpha')], silentLogger)
    ).rejects.toThrow('IO error')

    expect(await readRaw('alpha')).toEqual({ data: { value: 'a' }, version: 1 })
  })
})
