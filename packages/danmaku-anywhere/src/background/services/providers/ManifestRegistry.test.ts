import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { ManifestRegistry } from './ManifestRegistry'
import type {
  IManifestStore,
  ManifestEntry,
  ManifestRecord,
} from './ManifestStore'

/**
 * ManifestRegistry hydrates runners from storage on init (no network) and
 * reconciles against the backend `/manifest` catalog. Covers update() add-only
 * seeding (seed empty, add missing, never replace a changed preinstalled, leave
 * user imports), detect-vs-apply (getPendingUpdates diffs versions without
 * fetching files or applying; applyUpdates replaces only the named preinstalled
 * ids, never a user import or an unseeded id), skipping a bad/failed file,
 * index failures, that neither update() nor getPendingUpdates stamps
 * lastCheckedAt (only recordChecked does), and
 * register / unregister / hydrate-skip-invalid.
 */

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

function makeManifest(
  id: string,
  apiVersion = 1,
  version = '1.0.0'
): Record<string, unknown> {
  return {
    apiVersion,
    id,
    name: id,
    version,
    hosts: ['example.com'],
  }
}

interface CatalogEntry {
  id: string
  apiVersion: number
  version: string
  file: string
}

function manifestPath(id: string): string {
  return `src/manifests/${id}.json`
}

function catalogEntry(
  id: string,
  version = '1.0.0',
  apiVersion = 1
): CatalogEntry {
  return { id, apiVersion, version, file: manifestPath(id) }
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

function fileFetches(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes('/manifest/file'))
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
  private lastCheckedAt: number | null = null

  constructor(private record: ManifestRecord = {}) {}

  async getAll() {
    return { ...this.record }
  }

  async getLastCheckedAt() {
    return this.lastCheckedAt
  }

  async setLastCheckedAt(timestamp: number) {
    this.lastCheckedAt = timestamp
  }

  async get(id: string) {
    return this.record[id]
  }

  async has(id: string) {
    return id in this.record
  }

  async set(id: string, entry: ManifestEntry) {
    await this.setMany({ [id]: entry })
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

  it('update seeds an empty store as preinstalled', async () => {
    stubCatalogFetch([catalogEntry('one'), catalogEntry('two')], {
      [manifestPath('one')]: makeManifest('one'),
      [manifestPath('two')]: makeManifest('two'),
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()

    const record = await store.getAll()
    expect(Object.keys(record).sort()).toEqual(['one', 'two'])
    for (const id of ['one', 'two']) {
      expect(record[id].kind).toBe('preinstalled')
      expect(registry.getRunner(id)).toBeDefined()
    }
  })

  it('listManifests returns id/name/version for each registered manifest', async () => {
    stubCatalogFetch([], {})
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '2.1.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(registry.listManifests()).toEqual([
      { id: 'one', name: 'one', version: '2.1.0', configSchema: undefined },
    ])
  })

  it('update does not stamp lastCheckedAt; recordChecked does', async () => {
    stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)

    await registry.update()
    expect(await registry.getLastCheckedAt()).toBeNull()

    await registry.recordChecked()
    expect(await registry.getLastCheckedAt()).toBeGreaterThan(0)
  })

  it('update skips entries whose apiVersion is unsupported', async () => {
    const fetchMock = stubCatalogFetch(
      [catalogEntry('good'), catalogEntry('future', '1.0.0', 999)],
      { [manifestPath('good')]: makeManifest('good') }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()

    expect(registry.list()).toEqual(['good'])
    expect(fileFetches(fetchMock).some((url) => url.includes('future'))).toBe(
      false
    )
  })

  it('update leaves the store empty when the index fetch fails', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.update()).resolves.toBe(false)

    expect(await store.getAll()).toEqual({})
    expect(registry.list()).toEqual([])
  })

  it('update leaves the store empty when the index body is malformed', async () => {
    stubFetch((url) =>
      url.includes('/manifest/file')
        ? { status: 200, body: makeManifest('x') }
        : { status: 200, body: { packageVersion: '0.0.0' } }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.update()).resolves.toBe(false)

    expect(await store.getAll()).toEqual({})
    expect(registry.list()).toEqual([])
  })

  it('update skips a catalog file that fails schema validation', async () => {
    stubCatalogFetch([catalogEntry('good'), catalogEntry('bad')], {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('bad')]: { apiVersion: 1, id: 'bad' },
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()

    expect(registry.list()).toEqual(['good'])
    expect(Object.keys(await store.getAll())).toEqual(['good'])
  })

  it('update skips a manifest whose id does not match the catalog entry', async () => {
    stubCatalogFetch([catalogEntry('good'), catalogEntry('mismatch')], {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('mismatch')]: makeManifest('something-else'),
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()

    expect(Object.keys(await store.getAll())).toEqual(['good'])
  })

  it('update skips a file that fails to fetch and re-fetches it next run', async () => {
    stubCatalogFetch(
      [catalogEntry('good'), catalogEntry('broken')],
      { [manifestPath('good')]: makeManifest('good') },
      { [manifestPath('broken')]: 500 }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()
    expect(Object.keys(await store.getAll())).toEqual(['good'])

    stubCatalogFetch([catalogEntry('good'), catalogEntry('broken')], {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('broken')]: makeManifest('broken'),
    })
    await registry.update()
    expect(registry.list().sort()).toEqual(['broken', 'good'])
  })

  it('update does not re-fetch or rewrite an unchanged manifest', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '1.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '1.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const setMany = vi.spyOn(store, 'setMany')
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.update()

    expect(fileFetches(fetchMock)).toEqual([])
    expect(setMany).not.toHaveBeenCalled()
  })

  it('update does not replace a preinstalled manifest whose catalog version changed', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '2.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.update()

    expect((await store.get('one'))?.manifest).toMatchObject({
      version: '1.0.0',
    })
    expect(fileFetches(fetchMock)).toEqual([])
  })

  it('getPendingUpdates surfaces a changed preinstalled version without fetching files or applying', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '2.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    const pending = await registry.getPendingUpdates()

    expect(pending).toEqual([
      { manifestId: 'one', fromVersion: '1.0.0', toVersion: '2.0.0' },
    ])
    expect(fileFetches(fetchMock)).toEqual([])
    expect((await store.get('one'))?.manifest).toMatchObject({
      version: '1.0.0',
    })
  })

  it('getPendingUpdates ignores unchanged entries and user imports', async () => {
    stubCatalogFetch(
      [catalogEntry('one', '1.0.0'), catalogEntry('two', '2.0.0')],
      {}
    )
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
      two: { manifest: makeManifest('two', 1, '1.0.0'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(await registry.getPendingUpdates()).toEqual([])
  })

  it('getPendingUpdates does not stamp lastCheckedAt (detection is not a sync)', async () => {
    stubCatalogFetch([catalogEntry('one', '2.0.0')], {})
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.getPendingUpdates()

    expect(await registry.getLastCheckedAt()).toBeNull()
  })

  it('getPendingUpdates returns nothing when the index fetch fails', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(await registry.getPendingUpdates()).toEqual([])
  })

  it('applyUpdates replaces only the named ids and rebuilds their runners', async () => {
    stubCatalogFetch(
      [catalogEntry('one', '2.0.0'), catalogEntry('two', '2.0.0')],
      {
        [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
        [manifestPath('two')]: makeManifest('two', 1, '2.0.0'),
      }
    )
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
      two: { manifest: makeManifest('two', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.applyUpdates(['one'])

    expect((await store.get('one'))?.manifest).toMatchObject({
      version: '2.0.0',
    })
    expect((await store.get('two'))?.manifest).toMatchObject({
      version: '1.0.0',
    })
  })

  it('applyUpdates leaves a user import and an unseeded id untouched', async () => {
    const fetchMock = stubCatalogFetch(
      [catalogEntry('mine', '2.0.0'), catalogEntry('fresh', '1.0.0')],
      {
        [manifestPath('mine')]: makeManifest('mine', 1, '2.0.0'),
        [manifestPath('fresh')]: makeManifest('fresh', 1, '1.0.0'),
      }
    )
    const store = new InMemoryStore({
      mine: { manifest: makeManifest('mine', 1, '1.0.0'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.applyUpdates(['mine', 'fresh'])

    expect(await store.get('mine')).toEqual({
      manifest: makeManifest('mine', 1, '1.0.0'),
      kind: 'user',
    })
    expect(await store.has('fresh')).toBe(false)
    expect(fileFetches(fetchMock)).toEqual([])
  })

  it('applyUpdates skips a file that fails to fetch', async () => {
    stubCatalogFetch(
      [catalogEntry('one', '2.0.0')],
      {},
      { [manifestPath('one')]: 500 }
    )
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.applyUpdates(['one'])

    expect((await store.get('one'))?.manifest).toMatchObject({
      version: '1.0.0',
    })
  })

  it('update leaves a user import untouched even when the catalog lists the same id', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '2.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.update()

    const stored = await store.get('one')
    expect(stored?.kind).toBe('user')
    expect(stored?.manifest).toMatchObject({ version: '1.0.0' })
    expect(fileFetches(fetchMock)).toEqual([])
  })

  it('update adds newly-listed manifests to a populated store', async () => {
    stubCatalogFetch(
      [catalogEntry('one', '1.0.0'), catalogEntry('two', '1.0.0')],
      {
        [manifestPath('one')]: makeManifest('one', 1, '1.0.0'),
        [manifestPath('two')]: makeManifest('two', 1, '1.0.0'),
      }
    )
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.update()

    expect(registry.list().sort()).toEqual(['one', 'two'])
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
