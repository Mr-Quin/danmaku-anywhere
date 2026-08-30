import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import type { ManifestRecord } from './ManifestStore'
import { ManifestStore } from './ManifestStore'

/**
 * ManifestStore persists a single `manifests` record in chrome.storage.local
 * keyed by manifest id. Verifies getAll defaults to an empty record, that
 * get/has/set/setMany/remove read and mutate the stored record without
 * clobbering sibling entries, that lastCheckedAt round-trips through its own
 * storage key, and that the write mutex serializes concurrent read-modify-write
 * so no write is lost.
 */

async function backStorageWith(record: ManifestRecord) {
  await fakeBrowser.storage.local.set({ manifests: record })
}

async function readStoredManifests(): Promise<ManifestRecord> {
  const stored = await fakeBrowser.storage.local.get('manifests')
  return stored.manifests as ManifestRecord
}

describe('ManifestStore', () => {
  it('getAll returns an empty record when nothing is stored', async () => {
    const store = new ManifestStore()
    expect(await store.getAll()).toEqual({})
  })

  it('get and has resolve against the stored record', async () => {
    await backStorageWith({ 'a:1': { manifest: { id: 'a:1' }, kind: 'user' } })
    const store = new ManifestStore()
    expect(await store.has('a:1')).toBe(true)
    expect(await store.has('missing')).toBe(false)
    expect(await store.get('a:1')).toEqual({
      manifest: { id: 'a:1' },
      kind: 'user',
    })
    expect(await store.get('missing')).toBeUndefined()
  })

  it('set merges into the existing record', async () => {
    await backStorageWith({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
    })
    const store = new ManifestStore()
    await store.set('b:2', { manifest: { id: 'b:2' }, kind: 'user' })
    expect(await readStoredManifests()).toEqual({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
      'b:2': { manifest: { id: 'b:2' }, kind: 'user' },
    })
  })

  it('setMany merges entries and overwrites only colliding ids', async () => {
    await backStorageWith({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
      'b:2': { manifest: { id: 'b:2' }, kind: 'user' },
    })
    const store = new ManifestStore()
    await store.setMany({
      'b:2': { manifest: { id: 'b:2', v: 2 }, kind: 'preinstalled' },
      'c:3': { manifest: { id: 'c:3' }, kind: 'user' },
    })
    expect(await readStoredManifests()).toEqual({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
      'b:2': { manifest: { id: 'b:2', v: 2 }, kind: 'preinstalled' },
      'c:3': { manifest: { id: 'c:3' }, kind: 'user' },
    })
  })

  it('remove drops a single entry and is a no-op when absent', async () => {
    await backStorageWith({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
      'b:2': { manifest: { id: 'b:2' }, kind: 'user' },
    })
    const store = new ManifestStore()
    await store.remove('b:2')
    expect(await readStoredManifests()).toEqual({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
    })

    const set = vi.spyOn(fakeBrowser.storage.local, 'set')
    await store.remove('missing')
    expect(set).not.toHaveBeenCalled()
  })

  it('lastCheckedAt defaults to null and round-trips through its own key', async () => {
    const store = new ManifestStore()
    expect(await store.getLastCheckedAt()).toBeNull()

    await store.setLastCheckedAt(1234)
    expect(await fakeBrowser.storage.local.get('manifestsLastChecked')).toEqual(
      {
        manifestsLastChecked: 1234,
      }
    )
  })

  it('lastCheckedAt reads back the stored timestamp', async () => {
    await fakeBrowser.storage.local.set({ manifestsLastChecked: 9999 })
    const store = new ManifestStore()
    expect(await store.getLastCheckedAt()).toBe(9999)
  })

  it('serializes concurrent writes so none clobber each other', async () => {
    // Without serialization the two read-modify-writes both read the same base
    // and the later set drops the earlier add; the mutex must keep all three.
    await backStorageWith({ 'c:3': { manifest: { id: 'c:3' }, kind: 'user' } })
    const store = new ManifestStore()

    await Promise.all([
      store.set('a:1', { manifest: { id: 'a:1' }, kind: 'user' }),
      store.set('b:2', { manifest: { id: 'b:2' }, kind: 'user' }),
    ])

    expect(Object.keys(await readStoredManifests()).sort()).toEqual([
      'a:1',
      'b:2',
      'c:3',
    ])
  })
})
