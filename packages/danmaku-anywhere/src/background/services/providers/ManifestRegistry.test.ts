import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { ManifestRegistry } from './ManifestRegistry'
import type {
  IManifestStore,
  ManifestEntry,
  ManifestRecord,
} from './ManifestStore'

/**
 * ManifestRegistry is storage-backed: init only hydrates runners from the
 * store (no network), while seedIfEmpty fetches the backend `/manifest`
 * catalog into an empty store. Verifies hydrate-without-fetch, seedIfEmpty's
 * catalog seeding / apiVersion gating / fetch-failure-leaves-empty / no-op on
 * a populated store, getRunner resolution, register / unregister mutating both
 * store and runner map, and an invalid stored manifest being skipped.
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

function makeResponse(status: number, body: unknown) {
  return {
    status,
    headers: { forEach: () => {} },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function stubFetch(
  respond: (url: string) => { status: number; body: unknown }
) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const { status, body } = respond(String(input))
    return makeResponse(status, body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function fileParam(url: string): string {
  return new URL(url, 'http://x').searchParams.get('file') ?? ''
}

function stubCatalogFetch(
  entries: CatalogEntry[],
  files: Record<string, unknown>,
  fileStatus: Record<string, number> = {}
) {
  return stubFetch((url) => {
    if (url.includes('/manifest/file')) {
      const file = fileParam(url)
      return { status: fileStatus[file] ?? 200, body: files[file] }
    }
    return {
      status: 200,
      body: { packageVersion: '0.0.0', manifests: entries },
    }
  })
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
  it('hydrates runners from a populated store without fetching', async () => {
    const fetchMock = stubCatalogFetch([], {})
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'preinstalled' },
      'test:two': { manifest: makeManifest('test:two'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(fetchMock).not.toHaveBeenCalled()
    expect(registry.list().sort()).toEqual(['test:one', 'test:two'])
  })

  it('seedIfEmpty seeds the backend catalog into an empty store as preinstalled', async () => {
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
    await registry.seedIfEmpty()

    const record = await store.getAll()
    expect(Object.keys(record).sort()).toEqual(['one', 'two'])
    for (const id of ['one', 'two']) {
      expect(record[id].kind).toBe('preinstalled')
      expect(registry.getRunner(id)).toBeDefined()
    }
  })

  it('seedIfEmpty skips catalog entries whose apiVersion is unsupported', async () => {
    const fetchMock = stubCatalogFetch(
      [
        { id: 'good', apiVersion: 1, file: 'src/manifests/good.json' },
        { id: 'future', apiVersion: 999, file: 'src/manifests/future.json' },
      ],
      { 'src/manifests/good.json': makeManifest('good') }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.seedIfEmpty()

    expect(registry.list()).toEqual(['good'])
    const fetchedFiles = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/manifest/file'))
    expect(fetchedFiles.some((url) => url.includes('future'))).toBe(false)
  })

  it('seedIfEmpty leaves the store empty without throwing when the index fetch fails', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.seedIfEmpty()).resolves.toBeUndefined()

    expect(await store.getAll()).toEqual({})
    expect(registry.list()).toEqual([])
  })

  it('seedIfEmpty leaves the store empty when the index body is malformed', async () => {
    stubFetch((url) =>
      url.includes('/manifest/file')
        ? { status: 200, body: makeManifest('x') }
        : { status: 200, body: { packageVersion: '0.0.0' } }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.seedIfEmpty()).resolves.toBeUndefined()

    expect(await store.getAll()).toEqual({})
    expect(registry.list()).toEqual([])
  })

  it('seedIfEmpty skips a catalog file that fails schema validation', async () => {
    stubCatalogFetch(
      [
        { id: 'good', apiVersion: 1, file: 'src/manifests/good.json' },
        { id: 'bad', apiVersion: 1, file: 'src/manifests/bad.json' },
      ],
      {
        'src/manifests/good.json': makeManifest('good'),
        // Valid JSON, invalid manifest (missing name/version/hosts).
        'src/manifests/bad.json': { apiVersion: 1, id: 'bad' },
      }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.seedIfEmpty()

    expect(registry.list()).toEqual(['good'])
    expect(Object.keys(await store.getAll())).toEqual(['good'])
  })

  it('seedIfEmpty aborts the whole seed when one catalog file fails to fetch', async () => {
    stubCatalogFetch(
      [
        { id: 'good', apiVersion: 1, file: 'src/manifests/good.json' },
        { id: 'broken', apiVersion: 1, file: 'src/manifests/broken.json' },
      ],
      { 'src/manifests/good.json': makeManifest('good') },
      { 'src/manifests/broken.json': 500 }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.seedIfEmpty()).resolves.toBeUndefined()

    // All-or-nothing: the valid `good` is not persisted when a sibling fails.
    expect(await store.getAll()).toEqual({})
    expect(registry.list()).toEqual([])
  })

  it('seedIfEmpty retries on a later call after a failed seed', async () => {
    stubFetch(() => ({ status: 503, body: 'down' }))
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.seedIfEmpty()
    expect(registry.list()).toEqual([])

    stubCatalogFetch(
      [{ id: 'one', apiVersion: 1, file: 'src/manifests/one.json' }],
      { 'src/manifests/one.json': makeManifest('one') }
    )
    await registry.seedIfEmpty()
    expect(registry.list()).toEqual(['one'])
  })

  it('seedIfEmpty clears its cached attempt when a write throws, allowing retry', async () => {
    stubCatalogFetch(
      [{ id: 'one', apiVersion: 1, file: 'src/manifests/one.json' }],
      { 'src/manifests/one.json': makeManifest('one') }
    )
    const store = new InMemoryStore()
    vi.spyOn(store, 'setMany').mockRejectedValueOnce(new Error('write boom'))
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.seedIfEmpty()).resolves.toBeUndefined()
    expect(registry.list()).toEqual([])

    await registry.seedIfEmpty()
    expect(registry.list()).toEqual(['one'])
  })

  it('seedIfEmpty is single-flighted across concurrent calls', async () => {
    const fetchMock = stubCatalogFetch(
      [{ id: 'one', apiVersion: 1, file: 'src/manifests/one.json' }],
      { 'src/manifests/one.json': makeManifest('one') }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await Promise.all([registry.seedIfEmpty(), registry.seedIfEmpty()])

    const indexFetches = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.endsWith('/manifest'))
    expect(indexFetches).toHaveLength(1)
    expect(registry.list()).toEqual(['one'])
  })

  it('seedIfEmpty does not fetch or reseed when the store is already populated', async () => {
    const fetchMock = stubCatalogFetch([], {})
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'user' },
    })
    const setMany = vi.spyOn(store, 'setMany')
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.seedIfEmpty()

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

  it('register rejects an invalid manifest and leaves state unchanged', async () => {
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      registry.register({ apiVersion: 1, id: 'bad' }, 'user')
    ).rejects.toThrow(/invalid manifest/)

    expect(await store.has('bad')).toBe(false)
    expect(registry.list()).toEqual(['test:one'])
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
