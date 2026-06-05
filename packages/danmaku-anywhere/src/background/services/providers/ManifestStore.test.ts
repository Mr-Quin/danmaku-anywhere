import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockChrome } from '@/tests/mockChromeApis'
import type { ManifestRecord } from './ManifestStore'
import { ManifestStore } from './ManifestStore'

/**
 * ManifestStore persists a single `manifests` record in chrome.storage.local
 * keyed by manifest id. Verifies getAll defaults to an empty record, and that
 * get/has/set/remove read and mutate the stored record without clobbering
 * sibling entries.
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
})
