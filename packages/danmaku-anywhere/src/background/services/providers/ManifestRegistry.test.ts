import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { bundledCatalogIndex } from './bundledCatalog'
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
 * index failures (one retry after a delay, then give up), the offline bundle
 * fallback seeding built-ins whenever the index yields no usable manifests
 * (unreachable, empty, or all entries dropped by the apiVersion filter) and
 * never when it yields some, that neither update() nor getPendingUpdates
 * stamps lastCheckedAt (only recordChecked does), sending the browser and
 * backend cache bypasses only on a forced refresh, reusing a caller-supplied
 * index (including the failed and empty ones) instead of refetching, and
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
    identityFields: [],
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
  const fetchMock = vi.fn(async (input: unknown, _init?: unknown) => {
    const { status, body } = respond(String(input))
    return makeResponse(status, body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

interface FetchInit {
  cache?: string
  headers?: Record<string, string>
}

// What the two caches in front of the catalog each key off: the request header
// is what the backend reads, the cache mode is what the browser reads.
function bypassOf(init: unknown): {
  cacheMode: string | undefined
  header: string | undefined
} {
  const typed = init as FetchInit | undefined
  return {
    cacheMode: typed?.cache,
    header: typed?.headers?.['Cache-Control'],
  }
}

function fileParam(url: string): string {
  return new URL(url, 'http://x').searchParams.get('file') ?? ''
}

function fileFetches(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes('/manifest/file'))
}

function indexFetches(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter(
      (url) => url.includes('/manifest') && !url.includes('/manifest/file')
    )
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
  vi.useRealTimers()
})

// A failed index fetch sleeps before its single retry, so run the call under
// fake timers and skip past the delay. The no-op catch keeps a rejection that
// settles during the timer advance from surfacing as unhandled.
async function settleIndexRetry<T>(run: () => Promise<T>): Promise<T> {
  vi.useFakeTimers()
  const promise = run()
  promise.catch(() => {})
  await vi.advanceTimersByTimeAsync(1000)
  return promise
}

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

  it('update seeds the bundled catalog when the index is unreachable and the store is empty', async () => {
    const fetchMock = stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    const result = await settleIndexRetry(() => registry.update())

    expect(result).toBe('unreachable')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const bundledIds = bundledCatalogIndex()
      .map((entry) => entry.id)
      .sort()
    expect(bundledIds).toEqual(
      expect.arrayContaining(['dandanplay', 'bilibili', 'tencent'])
    )
    expect(registry.list().sort()).toEqual(bundledIds)
    for (const id of bundledIds) {
      expect(registry.getRunner(id)).toBeDefined()
    }
    const stored = await store.getAll()
    for (const id of bundledIds) {
      expect(stored[id]?.kind).toBe('bundled')
    }
  })

  it('update seeds the bundled catalog when the index lists no manifests', async () => {
    stubCatalogFetch([], {})
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    const result = await registry.update()

    expect(result).toBe('empty')
    expect(Object.keys(await store.getAll()).sort()).toEqual(
      bundledCatalogIndex()
        .map((entry) => entry.id)
        .sort()
    )
  })

  it('update seeds the bundled catalog when every index entry fails the apiVersion check', async () => {
    const fetchMock = stubCatalogFetch(
      [
        catalogEntry('future', '1.0.0', 999),
        catalogEntry('later', '2.0.0', 998),
      ],
      {}
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    const result = await registry.update()

    expect(result).toBe('empty')
    expect(fileFetches(fetchMock)).toEqual([])
    const bundledIds = bundledCatalogIndex()
      .map((entry) => entry.id)
      .sort()
    expect(Object.keys(await store.getAll()).sort()).toEqual(bundledIds)
    expect(registry.list().sort()).toEqual(bundledIds)
  })

  it('update auto-upgrades a bundle-seeded entry once the index becomes reachable', async () => {
    const store = new InMemoryStore({
      dandanplay: {
        manifest: makeManifest('dandanplay', 1, '0.5.0'),
        kind: 'bundled',
      },
    })
    stubCatalogFetch([catalogEntry('dandanplay', '0.6.0')], {
      [manifestPath('dandanplay')]: makeManifest('dandanplay', 1, '0.6.0'),
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    const result = await registry.update()

    expect(result).toBe('synced')
    const stored = await store.get('dandanplay')
    expect(stored?.kind).toBe('preinstalled')
    expect(stored?.manifest).toMatchObject({ version: '0.6.0' })
  })

  it('update leaves a bundle-seeded entry the catalog no longer lists alone', async () => {
    const store = new InMemoryStore({
      'user:one': {
        manifest: makeManifest('user:one', 1, '0.5.0'),
        kind: 'bundled',
      },
    })
    stubCatalogFetch([catalogEntry('other')], {
      [manifestPath('other')]: makeManifest('other'),
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.update()

    const stored = await store.get('user:one')
    expect(stored?.kind).toBe('bundled')
    expect(stored?.manifest).toMatchObject({ version: '0.5.0' })
  })

  it('getPendingUpdates does not list a bundle-seeded entry even when the catalog has moved on', async () => {
    const store = new InMemoryStore({
      dandanplay: {
        manifest: makeManifest('dandanplay', 1, '0.5.0'),
        kind: 'bundled',
      },
    })
    stubCatalogFetch([catalogEntry('dandanplay', '0.6.0')], {})
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(await registry.getPendingUpdates()).toEqual([])
  })

  it('applyUpdates replaces a bundle-seeded entry named directly', async () => {
    const store = new InMemoryStore({
      dandanplay: {
        manifest: makeManifest('dandanplay', 1, '0.5.0'),
        kind: 'bundled',
      },
    })
    stubCatalogFetch([catalogEntry('dandanplay', '0.6.0')], {
      [manifestPath('dandanplay')]: makeManifest('dandanplay', 1, '0.6.0'),
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await registry.applyUpdates(['dandanplay'])

    const stored = await store.get('dandanplay')
    expect(stored?.kind).toBe('preinstalled')
    expect(stored?.manifest).toMatchObject({ version: '0.6.0' })
  })

  it('update does not seed the bundle when the index is reachable', async () => {
    stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const store = new InMemoryStore()
    const setMany = vi.spyOn(store, 'setMany')
    const registry = new ManifestRegistry(silentLogger, store)
    const result = await registry.update()

    expect(result).toBe('synced')
    expect(registry.list()).toEqual(['one'])
    expect(setMany).toHaveBeenCalledTimes(1)
    expect(Object.keys(setMany.mock.calls[0][0])).toEqual(['one'])
  })

  it('update bundle fallback does not overwrite a manifest already in the store', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore({
      dandanplay: {
        manifest: makeManifest('dandanplay', 1, '0.0.1-custom'),
        kind: 'user',
      },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready
    await settleIndexRetry(() => registry.update())

    const stored = await store.get('dandanplay')
    expect(stored?.kind).toBe('user')
    expect(stored?.manifest).toMatchObject({ version: '0.0.1-custom' })
  })

  it('listManifests returns id/name/version/kind for each registered manifest', async () => {
    stubCatalogFetch([], {})
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '2.1.0'), kind: 'preinstalled' },
      'mine:one': { manifest: makeManifest('mine:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(registry.listManifests()).toEqual(
      expect.arrayContaining([
        {
          id: 'one',
          name: 'one',
          version: '2.1.0',
          configSchema: undefined,
          kind: 'preinstalled',
          identityFields: [],
        },
        {
          id: 'mine:one',
          name: 'mine:one',
          version: '1.0.0',
          configSchema: undefined,
          kind: 'user',
          identityFields: [],
        },
      ])
    )
  })

  it('listManifests resolves name and configSchema into the requested locale', async () => {
    const manifest = {
      ...makeManifest('one', 1, '1.0.0'),
      name: 'Source',
      configSchema: {
        type: 'object',
        properties: { baseUrl: { type: 'string', title: 'Base URL' } },
      },
      locales: {
        'zh-CN': {
          name: '来源',
          'configSchema.properties.baseUrl.title': '基础地址',
        },
      },
    }
    const store = new InMemoryStore({
      one: { manifest, kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    const [info] = registry.listManifests('zh-CN')
    expect(info.name).toBe('来源')
    expect(info.configSchema?.properties?.baseUrl.title).toBe('基础地址')
  })

  it('listManifests falls back to source strings when no locale is given', async () => {
    const manifest = {
      ...makeManifest('one', 1, '1.0.0'),
      name: 'Source',
      locales: { 'zh-CN': { name: '来源' } },
    }
    const store = new InMemoryStore({
      one: { manifest, kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(registry.listManifests()[0].name).toBe('Source')
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

  it('update retries once, then falls back to the bundle when the index fetch keeps failing', async () => {
    const fetchMock = stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(settleIndexRetry(() => registry.update())).resolves.toBe(
      'unreachable'
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(Object.keys(await store.getAll()).sort()).toEqual(
      bundledCatalogIndex()
        .map((entry) => entry.id)
        .sort()
    )
  })

  it('update succeeds when the index fetch recovers on the retry', async () => {
    let indexCalls = 0
    stubFetch((url) => {
      if (url.includes('/manifest/file')) {
        return { status: 200, body: makeManifest('one') }
      }
      indexCalls += 1
      if (indexCalls === 1) {
        return { status: 503, body: 'unavailable' }
      }
      return { status: 200, body: { manifests: [catalogEntry('one')] } }
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(settleIndexRetry(() => registry.update())).resolves.toBe(
      'synced'
    )

    expect(indexCalls).toBe(2)
    expect(registry.list()).toEqual(['one'])
  })

  it('update falls back to the bundle when the index body is malformed', async () => {
    stubFetch((url) =>
      url.includes('/manifest/file')
        ? { status: 200, body: makeManifest('x') }
        : { status: 200, body: { packageVersion: '0.0.0' } }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(settleIndexRetry(() => registry.update())).resolves.toBe(
      'unreachable'
    )

    expect(Object.keys(await store.getAll()).sort()).toEqual(
      bundledCatalogIndex()
        .map((entry) => entry.id)
        .sort()
    )
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

  it('getPendingUpdates throws when the index fetch fails (distinct from no updates)', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      settleIndexRetry(() => registry.getPendingUpdates())
    ).rejects.toThrow(/Failed to fetch the manifest catalog/)
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

  it('applyUpdates throws and leaves the manifest unchanged when a file fails to fetch', async () => {
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

    await expect(registry.applyUpdates(['one'])).rejects.toThrow(
      /Failed to apply updates/
    )

    expect((await store.get('one'))?.manifest).toMatchObject({
      version: '1.0.0',
    })
  })

  it('applyUpdates throws when the catalog index is unreachable', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      settleIndexRetry(() => registry.applyUpdates(['one']))
    ).rejects.toThrow(/Failed to fetch the manifest catalog/)
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

  // Paired: the forced half fails if force stops reaching the fetches, the
  // default half fails if the bypass is sent unconditionally. Either break
  // turns this red, which a one-sided assertion would not.
  it('sends the cache bypass on the index and file fetches only when forced', async () => {
    const forcedFetch = stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    await new ManifestRegistry(silentLogger, new InMemoryStore()).update(
      undefined,
      true
    )

    expect(indexFetches(forcedFetch)).toHaveLength(1)
    expect(fileFetches(forcedFetch)).toHaveLength(1)
    for (const [, init] of forcedFetch.mock.calls) {
      expect(bypassOf(init)).toEqual({
        cacheMode: 'reload',
        header: 'no-cache',
      })
    }

    vi.unstubAllGlobals()

    const defaultFetch = stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    await new ManifestRegistry(silentLogger, new InMemoryStore()).update()

    expect(indexFetches(defaultFetch)).toHaveLength(1)
    expect(fileFetches(defaultFetch)).toHaveLength(1)
    for (const [, init] of defaultFetch.mock.calls) {
      expect(bypassOf(init)).toEqual({
        cacheMode: undefined,
        header: undefined,
      })
    }
  })

  it('update reuses a passed-in index instead of fetching it', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())

    await registry.update([catalogEntry('one')], true)

    expect(indexFetches(fetchMock)).toEqual([])
    expect(fileFetches(fetchMock)).toHaveLength(1)
    expect(bypassOf(fetchMock.mock.calls[0][1]).header).toBe('no-cache')
  })

  it('getPendingUpdates reuses a passed-in index without any fetch', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '2.0.0')], {})
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    const pending = await registry.getPendingUpdates([
      catalogEntry('one', '2.0.0'),
    ])

    expect(pending).toEqual([
      { manifestId: 'one', fromVersion: '1.0.0', toVersion: '2.0.0' },
    ])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('applyUpdates reuses a passed-in index and forces the file fetch', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '2.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.applyUpdates(['one'], [catalogEntry('one', '2.0.0')], true)

    expect(indexFetches(fetchMock)).toEqual([])
    expect(fileFetches(fetchMock)).toHaveLength(1)
    expect(bypassOf(fetchMock.mock.calls[0][1])).toEqual({
      cacheMode: 'reload',
      header: 'no-cache',
    })
    expect((await store.get('one'))?.manifest).toMatchObject({
      version: '2.0.0',
    })
  })

  // null is the shared-fetch-already-failed signal, and it must not be retried
  // into a second failed round trip on top of the one that already happened.
  it('update seeds the bundle without refetching when the shared index failed', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one')], {})
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)

    await expect(registry.update(null, true)).resolves.toBe('unreachable')

    expect(fetchMock).not.toHaveBeenCalled()
    const seeded = await store.getAll()
    expect(Object.keys(seeded).sort()).toEqual(
      bundledCatalogIndex()
        .map((entry) => entry.id)
        .sort()
    )
  })

  it('update seeds the bundle when the shared index came back empty', async () => {
    const fetchMock = stubCatalogFetch([], {})
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)

    await expect(registry.update([], true)).resolves.toBe('empty')

    expect(fetchMock).not.toHaveBeenCalled()
    const seeded = await store.getAll()
    expect(Object.keys(seeded).sort()).toEqual(
      bundledCatalogIndex()
        .map((entry) => entry.id)
        .sort()
    )
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

  it('saveUserManifest create stores a user manifest and builds its runner', async () => {
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.saveUserManifest(makeManifest('mine:one'), 'create')

    expect(await store.get('mine:one')).toMatchObject({ kind: 'user' })
    expect(registry.getRunner('mine:one')).toBeDefined()
  })

  it('saveUserManifest create rejects an id that already exists', async () => {
    const store = new InMemoryStore({
      'builtin:one': {
        manifest: makeManifest('builtin:one'),
        kind: 'preinstalled',
      },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      registry.saveUserManifest(makeManifest('builtin:one'), 'create')
    ).rejects.toThrow(/already exists/)
    expect(await store.get('builtin:one')).toMatchObject({
      kind: 'preinstalled',
    })
  })

  it('saveUserManifest update overwrites an existing user manifest', async () => {
    const store = new InMemoryStore({
      'mine:one': { manifest: makeManifest('mine:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await registry.saveUserManifest(
      makeManifest('mine:one', 1, '2.0.0'),
      'update',
      'mine:one'
    )

    expect((await store.get('mine:one'))?.manifest).toMatchObject({
      version: '2.0.0',
    })
  })

  it('saveUserManifest update requires the expected id', async () => {
    const store = new InMemoryStore({
      'mine:one': { manifest: makeManifest('mine:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      registry.saveUserManifest(makeManifest('mine:one', 1, '2.0.0'), 'update')
    ).rejects.toThrow(/cannot be changed/)
    expect((await store.get('mine:one'))?.manifest).toMatchObject({
      version: '1.0.0',
    })
  })

  it('saveUserManifest update refuses an id that differs from the edited one', async () => {
    const store = new InMemoryStore({
      'mine:one': { manifest: makeManifest('mine:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      registry.saveUserManifest(makeManifest('mine:two'), 'update', 'mine:one')
    ).rejects.toThrow(/cannot be changed/)
    expect(await store.get('mine:two')).toBeUndefined()
  })

  it('saveUserManifest update refuses a preinstalled id', async () => {
    const store = new InMemoryStore({
      'builtin:one': {
        manifest: makeManifest('builtin:one'),
        kind: 'preinstalled',
      },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    await expect(
      registry.saveUserManifest(
        makeManifest('builtin:one'),
        'update',
        'builtin:one'
      )
    ).rejects.toThrow(/no user manifest/i)
  })

  it('getSource returns the raw stored manifest and kind', async () => {
    const raw = makeManifest('mine:one')
    const store = new InMemoryStore({
      'mine:one': { manifest: raw, kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.ready

    expect(await registry.getSource('mine:one')).toEqual({
      manifest: raw,
      kind: 'user',
    })
    expect(await registry.getSource('missing')).toBeUndefined()
  })
})
