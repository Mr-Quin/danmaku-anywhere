import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { silentLogger } from '@/tests/silentLogger'
import type { IStoreService } from './IStoreService'
import { OptionsService } from './OptionsService/OptionsService'
import type { StoreSnapshot } from './OptionsService/types'
import {
  type UpgradeSnapshot,
  type UpgradeSnapshotStore,
  upgradeStores,
} from './upgradeStores'

/**
 * upgradeStores migrates every store with a snapshot of all stored data taken
 * before any store is written, and saves it before the first write. Given the
 * snapshot of an earlier attempt, a retry hands every step the data from
 * before that attempt. Each captured entry is kept while its store is still
 * at the captured version or already at its latest version; a store changed
 * any other way is captured again on its own. A store that fails does not
 * stop the others, and the call then rejects naming each failed store. A
 * read error while taking the snapshot rejects before anything is written.
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

// The same store in a later release that adds a version 3.
function createNextReleaseStore(
  key: string,
  onMigrate?: (stores: StoreSnapshot) => void
) {
  const store = createStore(key)
  store.options.version(3, {
    upgrade: (data: Value, context) => {
      onMigrate?.(context.stores)
      return data
    },
  })
  return { ...store, descriptor: { ...store.descriptor, latestVersion: 3 } }
}

function memorySnapshots(kept?: UpgradeSnapshot) {
  const saved: UpgradeSnapshot[] = []
  const store: UpgradeSnapshotStore & { saved: UpgradeSnapshot[] } = {
    kept,
    saved,
    async save(snapshot) {
      saved.push(snapshot)
      store.kept = snapshot
    },
  }
  return store
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

    await upgradeStores(stores, silentLogger, memorySnapshots())

    expect(seen).toEqual([{ alpha: { value: 'a' }, beta: { value: 'b' } }])
  })

  it('leaves an absent store out of the snapshot and writes its defaults', async () => {
    await storeAt('beta', 'b', 1)
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('alpha'),
      createStore('beta', (snapshot) => seen.push(snapshot)),
    ]

    await upgradeStores(stores, silentLogger, memorySnapshots())

    expect(seen).toEqual([{ beta: { value: 'b' } }])
    expect(await readRaw('alpha')).toEqual({
      data: { value: 'default' },
      version: 2,
    })
  })

  it('upgrades the other stores and names the one that failed', async () => {
    await storeAt('alpha', 'a', 1)
    await storeAt('beta', 'b', 1)
    failWritesTo('alpha')

    await expect(
      upgradeStores(
        [createStore('alpha'), createStore('beta')],
        silentLogger,
        memorySnapshots()
      )
    ).rejects.toThrow(/alpha/)

    expect(await readRaw('alpha')).toEqual({ data: { value: 'a' }, version: 1 })
    expect(await readRaw('beta')).toEqual({
      data: { value: 'b upgraded' },
      version: 2,
    })
  })

  it('saves the snapshot with store versions before the first write', async () => {
    await storeAt('alpha', 'a', 1)
    const snapshots = memorySnapshots()
    let savedAtWrite: UpgradeSnapshot[] = []
    const set = fakeBrowser.storage.local.set.bind(fakeBrowser.storage.local)
    vi.spyOn(fakeBrowser.storage.local, 'set').mockImplementation(
      async (items) => {
        savedAtWrite = [...snapshots.saved]
        return set(items)
      }
    )

    await upgradeStores([createStore('alpha')], silentLogger, snapshots)

    expect(savedAtWrite).toEqual([
      { alpha: { data: { value: 'a' }, version: 1 } },
    ])
  })

  it('hands a retry the data from before the first attempt', async () => {
    await storeAt('alpha', 'a', 1)
    await storeAt('beta', 'b', 1)
    const seen: StoreSnapshot[] = []
    const stores = [
      createStore('alpha'),
      createStore('beta', (snapshot) => seen.push(snapshot)),
    ]
    const snapshots = memorySnapshots()
    const failing = failWritesTo('beta')
    await expect(
      upgradeStores(stores, silentLogger, snapshots)
    ).rejects.toThrow(/beta/)
    expect(await readRaw('alpha')).toMatchObject({ version: 2 })
    failing.mockRestore()

    await upgradeStores(stores, silentLogger, snapshots)

    expect(seen.at(-1)).toEqual({ alpha: { value: 'a' }, beta: { value: 'b' } })
    expect(snapshots.saved).toHaveLength(1)
  })

  it('captures again only a store deleted since the snapshot', async () => {
    await storeAt('alpha', 'a', 1)
    const seen: StoreSnapshot[] = []
    const snapshots = memorySnapshots({
      alpha: { data: { value: 'a' }, version: 1 },
      beta: { data: { value: 'b' }, version: 1 },
    })

    await upgradeStores(
      [createStore('alpha', (s) => seen.push(s)), createStore('beta')],
      silentLogger,
      snapshots
    )

    expect(seen).toEqual([{ alpha: { value: 'a' } }])
    expect(snapshots.saved).toEqual([
      { alpha: { data: { value: 'a' }, version: 1 } },
    ])
  })

  it('captures again a store synced at another version and keeps the rest', async () => {
    await storeAt('alpha', 'a upgraded', 3)
    await storeAt('beta', 'b synced', 2)
    const seen: StoreSnapshot[] = []

    await upgradeStores(
      [
        createNextReleaseStore('alpha'),
        createNextReleaseStore('beta', (s) => seen.push(s)),
      ],
      silentLogger,
      memorySnapshots({
        alpha: { data: { value: 'a' }, version: 1 },
        beta: { data: { value: 'b' }, version: 1 },
      })
    )

    expect(seen).toEqual([
      { alpha: { value: 'a' }, beta: { value: 'b synced' } },
    ])
  })

  it('saves no snapshot when every store is already current', async () => {
    await storeAt('alpha', 'a', 2)
    const snapshots = memorySnapshots()

    await upgradeStores([createStore('alpha')], silentLogger, snapshots)

    expect(snapshots.saved).toEqual([])
  })

  it('rejects before writing when a store cannot be read', async () => {
    await storeAt('alpha', 'a', 1)
    vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValueOnce(
      new Error('IO error')
    )

    await expect(
      upgradeStores([createStore('alpha')], silentLogger, memorySnapshots())
    ).rejects.toThrow('IO error')

    expect(await readRaw('alpha')).toEqual({ data: { value: 'a' }, version: 1 })
  })
})
