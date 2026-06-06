import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockChrome } from '@/tests/mockChromeApis'
import type { ManifestRecord } from './ManifestStore'
import { ManifestStore } from './ManifestStore'

/**
 * ManifestStore persists a single `manifests` record in chrome.storage.local
 * keyed by manifest id. Verifies getAll defaults to an empty record, that
 * get/has/set/setMany/remove read and mutate the stored record without
 * clobbering sibling entries, and that the write mutex serializes concurrent
 * read-modify-write so no write is lost.
 */

function backStorageWith(record: ManifestRecord | undefined) {
  mockChrome.storage.local.get.mockImplementation(async () => {
    return record === undefined ? {} : { manifests: record }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ManifestStore', () => {
  it('getAll returns an empty record when nothing is stored', async () => {
    backStorageWith(undefined)
    const store = new ManifestStore()
    expect(await store.getAll()).toEqual({})
  })

  it('get and has resolve against the stored record', async () => {
    backStorageWith({ 'a:1': { manifest: { id: 'a:1' }, kind: 'user' } })
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
    backStorageWith({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
    })
    const store = new ManifestStore()
    await store.set('b:2', { manifest: { id: 'b:2' }, kind: 'user' })
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      manifests: {
        'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
        'b:2': { manifest: { id: 'b:2' }, kind: 'user' },
      },
    })
  })

  it('setMany merges entries and overwrites only colliding ids', async () => {
    backStorageWith({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
      'b:2': { manifest: { id: 'b:2' }, kind: 'user' },
    })
    const store = new ManifestStore()
    await store.setMany({
      'b:2': { manifest: { id: 'b:2', v: 2 }, kind: 'preinstalled' },
      'c:3': { manifest: { id: 'c:3' }, kind: 'user' },
    })
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      manifests: {
        'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
        'b:2': { manifest: { id: 'b:2', v: 2 }, kind: 'preinstalled' },
        'c:3': { manifest: { id: 'c:3' }, kind: 'user' },
      },
    })
  })

  it('remove drops a single entry and is a no-op when absent', async () => {
    backStorageWith({
      'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' },
      'b:2': { manifest: { id: 'b:2' }, kind: 'user' },
    })
    const store = new ManifestStore()
    await store.remove('b:2')
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      manifests: { 'a:1': { manifest: { id: 'a:1' }, kind: 'preinstalled' } },
    })

    mockChrome.storage.local.set.mockClear()
    await store.remove('missing')
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('serializes concurrent writes so none clobber each other', async () => {
    let backing: ManifestRecord = {
      'c:3': { manifest: { id: 'c:3' }, kind: 'user' },
    }
    mockChrome.storage.local.get.mockImplementation(async () => {
      await Promise.resolve()
      return { manifests: { ...backing } }
    })
    mockChrome.storage.local.set.mockImplementation(async (items) => {
      await Promise.resolve()
      backing = (items as { manifests: ManifestRecord }).manifests
    })
    const store = new ManifestStore()

    await Promise.all([
      store.set('a:1', { manifest: { id: 'a:1' }, kind: 'user' }),
      store.set('b:2', { manifest: { id: 'b:2' }, kind: 'user' }),
      store.remove('c:3'),
    ])

    expect(Object.keys(backing).sort()).toEqual(['a:1', 'b:2'])
  })
})
