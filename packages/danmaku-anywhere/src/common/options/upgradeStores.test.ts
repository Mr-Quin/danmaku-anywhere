import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { silentLogger } from '@/tests/silentLogger'
import type { IStoreService } from './IStoreService'
import { OptionsService } from './OptionsService/OptionsService'
import type { StoreSnapshot } from './OptionsService/types'
import { upgradeStores } from './upgradeStores'

/**
 * upgradeStores migrates the stores in order, handing every step the data all
 * stores had when the run started. It stops at the first store that fails and
 * rejects naming it, so the stores after it keep their old data for a retry.
 * A read error rejects before anything is written.
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

function storeAt(key: string, value: string, version: number) {
  return fakeBrowser.storage.local.set({
    [key]: { data: { value }, version },
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
    await storeAt('alpha', 'a', 1)
    await storeAt('beta', 'b', 1)
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('alpha'),
      createStore('beta', (snapshot) => seen.push(snapshot)),
    ]

    await upgradeStores(stores, silentLogger)

    expect(seen).toEqual([{ alpha: { value: 'a' }, beta: { value: 'b' } }])
  })

  it('leaves an absent store out and writes its defaults', async () => {
    await storeAt('beta', 'b', 1)
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

  it('stops at the store that failed and names it', async () => {
    await storeAt('alpha', 'a', 1)
    await storeAt('beta', 'b', 1)
    failWritesTo('alpha')

    await expect(
      upgradeStores([createStore('alpha'), createStore('beta')], silentLogger)
    ).rejects.toThrow(/alpha/)

    expect(await readRaw('alpha')).toEqual({ data: { value: 'a' }, version: 1 })
    expect(await readRaw('beta')).toEqual({ data: { value: 'b' }, version: 1 })
  })

  it('hands a reader that failed the original data of a later store on retry', async () => {
    await storeAt('reader', 'r', 1)
    await storeAt('read', 'original', 1)
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('reader', (snapshot) => seen.push(snapshot)),
      createStore('read'),
    ]
    const failing = failWritesTo('reader')
    await expect(upgradeStores(stores, silentLogger)).rejects.toThrow(/reader/)
    failing.mockRestore()

    await upgradeStores(stores, silentLogger)

    expect(seen.at(-1)).toEqual({
      reader: { value: 'r' },
      read: { value: 'original' },
    })
    expect(await readRaw('read')).toEqual({
      data: { value: 'original upgraded' },
      version: 2,
    })
  })

  it('rejects before writing when a store cannot be read', async () => {
    await storeAt('alpha', 'a', 1)
    vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValueOnce(
      new Error('IO error')
    )

    await expect(
      upgradeStores([createStore('alpha')], silentLogger)
    ).rejects.toThrow('IO error')

    expect(await readRaw('alpha')).toEqual({ data: { value: 'a' }, version: 1 })
  })
})
