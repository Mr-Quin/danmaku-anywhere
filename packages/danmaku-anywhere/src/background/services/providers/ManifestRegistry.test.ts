import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { ManifestRegistry } from './ManifestRegistry'
import type {
  IManifestStore,
  ManifestEntry,
  ManifestRecord,
} from './ManifestStore'

/**
 * ManifestRegistry is storage-backed: on init it seeds the backend `/manifest`
 * catalog into an empty store and builds a runner per stored manifest.
 * Verifies catalog seeding only on empty stores, apiVersion gating, a fetch
 * failure leaving the store empty without throwing, getRunner resolution,
 * register / unregister mutating both store and runner map, that an invalid
 * stored manifest is skipped rather than fatal, and idempotent init.
 */

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

function makeManifest(id: string, apiVersion = 1): Record<string, unknown> {
  return {
    apiVersion,
    id,
    name: id,
    version: '1.0.0',
    hosts: ['example.com'],
  }
}

interface CatalogEntry {
  id: string
  apiVersion: number
  file: string
}

function jsonResponse(body: unknown) {
  return {
    status: 200,
    headers: { forEach: () => {} },
    text: async () => JSON.stringify(body),
  }
}

function stubCatalogFetch(
  entries: CatalogEntry[],
  files: Record<string, unknown>
) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input)
    if (url.includes('/manifest/file')) {
      const file = new URL(url, 'http://x').searchParams.get('file') ?? ''
      return jsonResponse(files[file])
    }
    return jsonResponse({ packageVersion: '0.0.0', manifests: entries })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

class InMemoryStore implements IManifestStore {
  constructor(private record: ManifestRecord = {}) {}

  async getAll() {
    return { ...this.record }
  }

  async get(id: string) {
    return this.record[id]
  }

  async has(id: string) {
    return id in this.record
  }

  async set(id: string, entry: ManifestEntry) {
    this.record[id] = entry
  }

  async setMany(entries: ManifestRecord) {
    this.record = { ...this.record, ...entries }
  }

  async remove(id: string) {
    delete this.record[id]
  }
}

describe('ManifestRegistry', () => {
  it('seeds the backend catalog into an empty store as preinstalled', async () => {
    stubCatalogFetch(
      [
        { id: 'one', apiVersion: 1, file: 'src/manifests/one.json' },
        { id: 'two', apiVersion: 1, file: 'src/manifests/two.json' },
      ],
      {
        'src/manifests/one.json': makeManifest('one'),
        'src/manifests/two.json': makeManifest('two'),
      }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    const record = await store.getAll()
    expect(Object.keys(record).sort()).toEqual(['one', 'two'])
    for (const id of ['one', 'two']) {
      expect(record[id].kind).toBe('preinstalled')
      expect(registry.getRunner(id)).toBeDefined()
    }
  })

  it('skips catalog entries whose apiVersion is unsupported', async () => {
    const fetchMock = stubCatalogFetch(
      [
        { id: 'good', apiVersion: 1, file: 'src/manifests/good.json' },
        { id: 'future', apiVersion: 999, file: 'src/manifests/future.json' },
      ],
      { 'src/manifests/good.json': makeManifest('good') }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(registry.list()).toEqual(['good'])
    const fetchedFiles = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/manifest/file'))
    expect(fetchedFiles.some((url) => url.includes('future'))).toBe(false)
  })

  it('leaves the store empty without throwing when the catalog fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 503,
        headers: { forEach: () => {} },
        text: async () => 'unavailable',
      }))
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.ready).resolves.toBeUndefined()

    expect(await store.getAll()).toEqual({})
    expect(registry.list()).toEqual([])
  })

  it('does not reseed when the store is already populated', async () => {
    const fetchMock = stubCatalogFetch([], {})
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'user' },
    })
    const setMany = vi.spyOn(store, 'setMany')
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(fetchMock).not.toHaveBeenCalled()
    expect(setMany).not.toHaveBeenCalled()
    expect(registry.list()).toEqual(['test:one'])
    expect(registry.getRunner('test:one')).toBeDefined()
  })

  it('getRunner throws for an unknown manifest id', async () => {
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(() => registry.getRunner('missing')).toThrow(
      /no manifest registered/
    )
  })

  it('register persists the manifest and builds a runner', async () => {
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.register(makeManifest('test:two'), 'user')

    expect(await store.get('test:two')).toEqual({
      manifest: makeManifest('test:two'),
      kind: 'user',
    })
    expect(registry.getRunner('test:two')).toBeDefined()
  })

  it('unregister removes the manifest from store and runners', async () => {
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.unregister('test:one')

    expect(await store.has('test:one')).toBe(false)
    expect(() => registry.getRunner('test:one')).toThrow()
  })

  it('skips a manifest that fails safeParse without taking the registry down', async () => {
    const store = new InMemoryStore({
      'good:one': { manifest: makeManifest('good:one'), kind: 'user' },
      'bad:one': { manifest: makeManifest('bad:one', 999), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(registry.getRunner('good:one')).toBeDefined()
    expect(() => registry.getRunner('bad:one')).toThrow()
    expect(registry.list()).toEqual(['good:one'])
  })
})
