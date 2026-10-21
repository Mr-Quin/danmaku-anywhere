import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger, type LogEntry } from '@/common/Logger'
import { publishDataChange } from '@/common/messaging/dataChangeChannel'
import { silentLogger } from '@/tests/silentLogger'
import { bundledCatalogIndex, bundledManifestRaw } from './bundledCatalog'
import { ManifestRegistry } from './ManifestRegistry'
import {
  type IManifestStore,
  type ManifestEntry,
  type ManifestRecord,
  ManifestStore,
} from './ManifestStore'

/**
 * ManifestRegistry hydrates runners from storage on init (no network) and
 * reconciles against the backend `/manifest` catalog. Covers update() add-only
 * seeding (seed empty, add missing, never replace a changed preinstalled, leave
 * user imports), detect-vs-apply (getPendingUpdates diffs versions without
 * fetching files or applying; applyUpdates replaces only the named preinstalled
 * ids, never a user import or an unseeded id), skipping a bad/failed file
 * (a timed-out file is logged with its error name and path while the rest
 * still apply), file fetches getting a longer timeout than the index,
 * index failures (one retry after a delay, then give up), the bundled
 * manifests registered on init and replaced by the catalog copy once it
 * downloads, that neither update() nor getPendingUpdates
 * stamps lastCheckedAt (only recordChecked does), and
 * unregister / hydrate-skip-invalid. Accessors wait for the stored manifests
 * to load, and a load that fails is retried by the next call. A store that
 * fails to read or write rejects the call and leaves the in-memory runners and
 * the stored record as they were. Every change that lands is announced on the
 * data-change channel with the manifest ids it touched and whether the
 * catalog side moved, once per batch; a call that changes nothing stays
 * quiet.
 */

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

vi.mock('@/common/messaging/dataChangeChannel', () => ({
  publishDataChange: vi.fn(),
}))

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

const BUNDLED_IDS = new Set(bundledCatalogIndex().map((entry) => entry.id))

// Every registry also holds the bundled manifests, so assertions about other
// sources look past them.
function nonBundled(ids: string[]): string[] {
  return ids.filter((id) => !BUNDLED_IDS.has(id)).sort()
}

async function registeredIds(registry: ManifestRegistry): Promise<string[]> {
  const manifests = await registry.listManifests()
  return manifests.map((manifest) => manifest.id)
}

describe('ManifestRegistry', () => {
  it('hydrates runners from a populated store without fetching', async () => {
    const fetchMock = stubCatalogFetch([], {})
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'preinstalled' },
      'test:two': { manifest: makeManifest('test:two'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(nonBundled(await registeredIds(registry))).toEqual([
      'test:one',
      'test:two',
    ])
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
    expect(nonBundled(Object.keys(record))).toEqual(['one', 'two'])
    for (const id of ['one', 'two']) {
      expect(record[id].kind).toBe('preinstalled')
      expect(await registry.getRunner(id)).toBeDefined()
    }
  })

  it('update reports an index that lists no manifests as empty', async () => {
    stubCatalogFetch([], {})
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)

    expect(await registry.update()).toEqual({ success: true, data: 'empty' })
  })

  it('update reports an index whose entries all fail the apiVersion check as empty', async () => {
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

    expect(result).toEqual({ success: true, data: 'empty' })
    expect(fileFetches(fetchMock)).toEqual([])
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
    const result = await registry.update()

    expect(result).toEqual({ success: true, data: 'synced' })
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
    await registry.applyUpdates(['dandanplay'])

    const stored = await store.get('dandanplay')
    expect(stored?.kind).toBe('preinstalled')
    expect(stored?.manifest).toMatchObject({ version: '0.6.0' })
  })

  it('init does not overwrite a stored manifest with its bundled copy', async () => {
    const store = new InMemoryStore({
      dandanplay: {
        manifest: makeManifest('dandanplay', 1, '0.0.1-custom'),
        kind: 'user',
      },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()

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

    expect(await registry.listManifests()).toEqual(
      expect.arrayContaining([
        {
          id: 'one',
          name: 'one',
          version: '2.1.0',
          configSchema: undefined,
          kind: 'preinstalled',
        },
        {
          id: 'mine:one',
          name: 'mine:one',
          version: '1.0.0',
          configSchema: undefined,
          kind: 'user',
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

    const [info] = await registry.listManifests('zh-CN')
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

    expect((await registry.listManifests())[0].name).toBe('Source')
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

    expect(nonBundled(await registeredIds(registry))).toEqual(['good'])
    expect(fileFetches(fetchMock).some((url) => url.includes('future'))).toBe(
      false
    )
  })

  it('update warns about each catalog entry dropped for an unsupported apiVersion', async () => {
    stubCatalogFetch(
      [catalogEntry('good'), catalogEntry('future', '1.0.0', 999)],
      { [manifestPath('good')]: makeManifest('good') }
    )
    const warn = vi.spyOn(silentLogger, 'warn')
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())
    await registry.update()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]).toContain('future')
    expect(warn.mock.calls[0]).toContain(999)
  })

  it('update retries once, then falls back to the bundle when the index fetch keeps failing', async () => {
    const fetchMock = stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(
      settleIndexRetry(() => registry.update())
    ).resolves.toMatchObject({ success: false })

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
    await expect(settleIndexRetry(() => registry.update())).resolves.toEqual({
      success: true,
      data: 'synced',
    })

    expect(indexCalls).toBe(2)
    expect(nonBundled(await registeredIds(registry))).toEqual(['one'])
  })

  it('update reports a malformed index body as unreachable', async () => {
    stubFetch((url) =>
      url.includes('/manifest/file')
        ? { status: 200, body: makeManifest('x') }
        : { status: 200, body: { packageVersion: '0.0.0' } }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(
      settleIndexRetry(() => registry.update())
    ).resolves.toMatchObject({ success: false })
  })

  it('update skips a catalog file that fails schema validation', async () => {
    stubCatalogFetch([catalogEntry('good'), catalogEntry('bad')], {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('bad')]: { apiVersion: 1, id: 'bad' },
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()

    expect(nonBundled(await registeredIds(registry))).toEqual(['good'])
    expect(nonBundled(Object.keys(await store.getAll()))).toEqual(['good'])
  })

  it('update skips a manifest whose id does not match the catalog entry', async () => {
    stubCatalogFetch([catalogEntry('good'), catalogEntry('mismatch')], {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('mismatch')]: makeManifest('something-else'),
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.update()

    expect(nonBundled(Object.keys(await store.getAll()))).toEqual(['good'])
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
    expect(nonBundled(Object.keys(await store.getAll()))).toEqual(['good'])

    stubCatalogFetch([catalogEntry('good'), catalogEntry('broken')], {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('broken')]: makeManifest('broken'),
    })
    await registry.update()
    expect(nonBundled(await registeredIds(registry))).toEqual([
      'broken',
      'good',
    ])
  })

  it('update applies the other files when one times out and logs the timeout readably', async () => {
    const entries = [
      catalogEntry('good'),
      catalogEntry('slow'),
      catalogEntry('other'),
    ]
    const files: Record<string, unknown> = {
      [manifestPath('good')]: makeManifest('good'),
      [manifestPath('other')]: makeManifest('other'),
    }
    stubFetch((url) => {
      if (!url.includes('/manifest/file')) {
        return { status: 200, body: { manifests: entries } }
      }
      const file = fileParam(url)
      if (file === manifestPath('slow')) {
        throw new DOMException('signal timed out', 'TimeoutError')
      }
      return { status: 200, body: files[file] }
    })
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const logEntries: LogEntry[] = []
    const logger = createLogger('', {
      onLog: (entry) => logEntries.push(entry),
    })
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(logger, store)

    expect(await registry.update()).toEqual({ success: true, data: 'synced' })
    expect(nonBundled(Object.keys(await store.getAll()))).toEqual([
      'good',
      'other',
    ])

    const consoleArgs = consoleError.mock.calls.find((args) =>
      args.includes('Failed to fetch catalog manifest:')
    )
    expect(consoleArgs).toBeDefined()
    expect(consoleArgs?.every((arg) => typeof arg === 'string')).toBe(true)
    const consoleLine = consoleArgs?.join(' ')
    expect(consoleLine).toContain('TimeoutError: signal timed out')
    expect(consoleLine).toContain(manifestPath('slow'))

    const stored = logEntries.find((entry) =>
      entry.message.includes('Failed to fetch catalog manifest')
    )
    expect(stored?.level).toBe('error')
    expect(stored?.message).toContain(manifestPath('slow'))
    expect(stored?.message).toContain('"name":"TimeoutError"')
    expect(stored?.message).toContain('"message":"signal timed out"')
  })

  it('file fetches get a longer timeout than the index fetch', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())
    await registry.update()

    expect(timeout).toHaveBeenCalledTimes(2)
    const [[indexMs], [fileMs]] = timeout.mock.calls
    expect(fileMs).toBeGreaterThan(indexMs)
  })

  it('update does not re-fetch or rewrite an unchanged manifest', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '1.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '1.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()
    const setMany = vi.spyOn(store, 'setMany')
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

    expect(await registry.getPendingUpdates()).toEqual([])
  })

  it('getPendingUpdates does not stamp lastCheckedAt (detection is not a sync)', async () => {
    stubCatalogFetch([catalogEntry('one', '2.0.0')], {})
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)

    await registry.getPendingUpdates()

    expect(await registry.getLastCheckedAt()).toBeNull()
  })

  it('getPendingUpdates throws when the index fetch fails (distinct from no updates)', async () => {
    stubFetch(() => ({ status: 503, body: 'unavailable' }))
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'preinstalled' },
    })
    const registry = new ManifestRegistry(silentLogger, store)

    await expect(
      settleIndexRetry(() => registry.getPendingUpdates())
    ).rejects.toMatchObject({
      code: 'http',
      params: { status: 503, target: { kind: 'catalog' } },
    })
  })

  it('codes an index that is not the catalog shape as a bad response', async () => {
    stubFetch(() => ({ status: 200, body: { unexpected: true } }))
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())

    await expect(
      settleIndexRetry(() => registry.getPendingUpdates())
    ).rejects.toMatchObject({
      code: 'badResponse',
      params: { target: { kind: 'catalog' } },
    })
  })

  it('codes a body that stops arriving after the timeout as a timeout', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      const controller = new AbortController()
      controller.abort(new DOMException('signal timed out', 'TimeoutError'))
      return controller.signal
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        headers: { forEach: () => {} },
        text: async () => {
          throw new DOMException('aborted', 'AbortError')
        },
      }))
    )
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())

    await expect(
      settleIndexRetry(() => registry.getPendingUpdates())
    ).rejects.toMatchObject({
      code: 'timeout',
      params: { target: { kind: 'catalog' } },
    })
  })

  it('codes an index fetch that never got a response as a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())

    await expect(
      settleIndexRetry(() => registry.getPendingUpdates())
    ).rejects.toMatchObject({
      code: 'network',
      params: { target: { kind: 'catalog' } },
    })
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

    await registry.applyUpdates(['mine', 'fresh'])

    expect(await store.get('mine')).toEqual({
      manifest: makeManifest('mine', 1, '1.0.0'),
      kind: 'user',
    })
    expect(await store.get('fresh')).toBeUndefined()
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

    await expect(registry.applyUpdates(['one'])).rejects.toMatchObject({
      code: 'catalog.applyFailed',
      params: { sources: [{ manifestId: 'one', name: expect.any(String) }] },
    })

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

    await expect(
      settleIndexRetry(() => registry.applyUpdates(['one']))
    ).rejects.toMatchObject({ code: 'http' })
  })

  it('update leaves a user import untouched even when the catalog lists the same id', async () => {
    const fetchMock = stubCatalogFetch([catalogEntry('one', '2.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
    })
    const store = new InMemoryStore({
      one: { manifest: makeManifest('one', 1, '1.0.0'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
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
    await registry.update()

    expect(nonBundled(await registeredIds(registry))).toEqual(['one', 'two'])
  })

  it('getRunner throws for an unknown manifest id', async () => {
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)

    await expect(registry.getRunner('missing')).rejects.toThrow(
      /no manifest registered/
    )
  })

  it('unregister removes the manifest from store and runners', async () => {
    const store = new InMemoryStore({
      'test:one': { manifest: makeManifest('test:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)

    await registry.unregister('test:one')

    expect(await store.get('test:one')).toBeUndefined()
    await expect(registry.getRunner('test:one')).rejects.toThrow()
  })

  it('skips a manifest that fails safeParse without taking the registry down', async () => {
    const store = new InMemoryStore({
      'good:one': { manifest: makeManifest('good:one'), kind: 'user' },
      'bad:one': { manifest: makeManifest('bad:one', 999), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)

    expect(await registry.getRunner('good:one')).toBeDefined()
    await expect(registry.getRunner('bad:one')).rejects.toThrow()
    expect(nonBundled(await registeredIds(registry))).toEqual(['good:one'])
  })

  it('saveUserManifest create stores a user manifest and builds its runner', async () => {
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)

    await registry.saveUserManifest(makeManifest('mine:one'), 'create')

    expect(await store.get('mine:one')).toMatchObject({ kind: 'user' })
    expect(await registry.getRunner('mine:one')).toBeDefined()
  })

  it('saveUserManifest create rejects an id that already exists', async () => {
    const store = new InMemoryStore({
      'builtin:one': {
        manifest: makeManifest('builtin:one'),
        kind: 'preinstalled',
      },
    })
    const registry = new ManifestRegistry(silentLogger, store)

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

    expect(await registry.getSource('mine:one')).toEqual({
      manifest: raw,
      kind: 'user',
    })
    expect(await registry.getSource('missing')).toBeUndefined()
  })
})

describe('ManifestRegistry storage failures', () => {
  class FlakyStore extends InMemoryStore {
    failReads = false
    failWrites = false

    override async getAll() {
      if (this.failReads) {
        throw new Error('IO error')
      }
      return super.getAll()
    }

    override async setMany(entries: ManifestRecord) {
      if (this.failWrites) {
        throw new Error('QUOTA_BYTES quota exceeded')
      }
      await super.setMany(entries)
    }

    override async remove(id: string) {
      if (this.failWrites) {
        throw new Error('QUOTA_BYTES quota exceeded')
      }
      await super.remove(id)
    }
  }

  it('rejects accessors while the store cannot be read', async () => {
    const store = new FlakyStore()
    store.failReads = true
    const registry = new ManifestRegistry(silentLogger, store)

    await expect(registry.listManifests()).rejects.toThrow('IO error')
    await expect(registry.getRunner('dandanplay')).rejects.toThrow('IO error')
  })

  it('loads on the next call once the store can be read again', async () => {
    const store = new FlakyStore({
      'mine:one': { manifest: makeManifest('mine:one'), kind: 'user' },
    })
    store.failReads = true
    const registry = new ManifestRegistry(silentLogger, store)
    await expect(registry.listManifests()).rejects.toThrow('IO error')

    store.failReads = false

    expect(nonBundled(await registeredIds(registry))).toEqual(['mine:one'])
    expect(await registry.getRunner('mine:one')).toBeDefined()
  })

  it('saveUserManifest rejects on a failed write and registers no runner', async () => {
    const store = new FlakyStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()
    store.failWrites = true

    await expect(
      registry.saveUserManifest(makeManifest('mine:one'), 'create')
    ).rejects.toThrow('QUOTA_BYTES quota exceeded')

    await expect(registry.getRunner('mine:one')).rejects.toThrow(
      /no manifest registered/
    )
  })

  it('unregister rejects on a failed write and keeps the runner', async () => {
    const store = new FlakyStore({
      'mine:one': { manifest: makeManifest('mine:one'), kind: 'user' },
    })
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()
    store.failWrites = true

    await expect(registry.unregister('mine:one')).rejects.toThrow(
      'QUOTA_BYTES quota exceeded'
    )

    expect(await registry.getRunner('mine:one')).toBeDefined()
  })

  it('update registers no catalog runner when the store write fails', async () => {
    stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const store = new FlakyStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()
    store.failWrites = true

    await expect(registry.update()).rejects.toThrow(
      'QUOTA_BYTES quota exceeded'
    )

    await expect(registry.getRunner('one')).rejects.toThrow(
      /no manifest registered/
    )
  })

  it('does not reseed over stored manifests that chrome.storage failed to read', async () => {
    const userEntry: ManifestEntry = {
      manifest: makeManifest('mine:one'),
      kind: 'user',
    }
    await fakeBrowser.storage.local.set({
      manifests: { 'mine:one': userEntry },
    })
    const get = vi
      .spyOn(fakeBrowser.storage.local, 'get')
      .mockRejectedValue(new Error('IO error'))

    const registry = new ManifestRegistry(silentLogger, new ManifestStore())

    await expect(registry.listManifests()).rejects.toThrow('IO error')
    get.mockRestore()
    expect(await fakeBrowser.storage.local.get('manifests')).toEqual({
      manifests: { 'mine:one': userEntry },
    })
  })
})

describe('ManifestRegistry bundled manifests', () => {
  it('registers the bundled manifests on load, with no catalog sync', async () => {
    const fetchMock = stubCatalogFetch([], {})
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)
    await registry.listManifests()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(BUNDLED_IDS).toEqual(new Set(await registeredIds(registry)))
    expect(BUNDLED_IDS).toContain('dandanplay')
    expect((await registry.getRunner('dandanplay')).manifest.id).toBe(
      'dandanplay'
    )
    const stored = await store.getAll()
    for (const id of BUNDLED_IDS) {
      expect(stored[id]?.kind).toBe('bundled')
    }
  })

  it('keeps a source usable from its bundled copy when its catalog file fails to download', async () => {
    stubCatalogFetch(
      [catalogEntry('dandanplay'), catalogEntry('bilibili')],
      { [manifestPath('bilibili')]: makeManifest('bilibili') },
      { [manifestPath('dandanplay')]: 500 }
    )
    const store = new InMemoryStore()
    const registry = new ManifestRegistry(silentLogger, store)

    expect(await registry.update()).toEqual({ success: true, data: 'synced' })
    expect((await registry.getRunner('dandanplay')).manifest.id).toBe(
      'dandanplay'
    )
    expect((await store.get('dandanplay'))?.kind).toBe('bundled')
    expect((await store.get('bilibili'))?.kind).toBe('preinstalled')
  })

  it('prefers the stored declaration over the bundled one', async () => {
    stubCatalogFetch([], {})
    const store = new InMemoryStore({
      dandanplay: {
        manifest: {
          ...makeManifest('dandanplay'),
          configSchema: {
            type: 'object',
            properties: { token: { type: 'string' } },
          },
        },
        kind: 'preinstalled',
      },
    })
    const registry = new ManifestRegistry(silentLogger, store)

    expect(
      (await registry.getRunner('dandanplay')).manifest.configSchema?.properties
    ).toHaveProperty('token')
  })
})

describe('ManifestRegistry change announcements', () => {
  function fullySeededStore(extra: ManifestRecord = {}): InMemoryStore {
    const record: ManifestRecord = {}
    for (const { id } of bundledCatalogIndex()) {
      record[id] = { manifest: bundledManifestRaw(id), kind: 'bundled' }
    }
    return new InMemoryStore({ ...record, ...extra })
  }

  function announced(manifestIds: string[], catalogChanged: boolean) {
    return { type: 'manifestsChanged', manifestIds, catalogChanged }
  }

  it('announces the bundle seed written on first load', async () => {
    const registry = new ManifestRegistry(silentLogger, new InMemoryStore())

    await registry.listManifests()

    expect(publishDataChange).toHaveBeenCalledExactlyOnceWith(
      announced([...BUNDLED_IDS], false)
    )
  })

  it('stays quiet when a load writes nothing', async () => {
    const registry = new ManifestRegistry(silentLogger, fullySeededStore())

    await registry.listManifests()

    expect(publishDataChange).not.toHaveBeenCalled()
  })

  it('announces the catalog copies a sync stores', async () => {
    stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const registry = new ManifestRegistry(silentLogger, fullySeededStore())

    await registry.update()

    expect(publishDataChange).toHaveBeenCalledExactlyOnceWith(
      announced(['one'], true)
    )
  })

  it('stays quiet when a catalog sync has nothing to store', async () => {
    stubCatalogFetch([catalogEntry('one')], {})
    const registry = new ManifestRegistry(
      silentLogger,
      fullySeededStore({
        one: { manifest: makeManifest('one'), kind: 'preinstalled' },
      })
    )

    expect(await registry.update()).toEqual({ success: true, data: 'synced' })

    expect(publishDataChange).not.toHaveBeenCalled()
  })

  it('announces applied updates as catalog changes', async () => {
    stubCatalogFetch([catalogEntry('one', '2.0.0')], {
      [manifestPath('one')]: makeManifest('one', 1, '2.0.0'),
    })
    const registry = new ManifestRegistry(
      silentLogger,
      fullySeededStore({
        one: { manifest: makeManifest('one'), kind: 'preinstalled' },
      })
    )

    await registry.applyUpdates(['one'])

    expect(publishDataChange).toHaveBeenCalledExactlyOnceWith(
      announced(['one'], true)
    )
  })

  it('announces a recorded catalog check with no manifest ids', async () => {
    const registry = new ManifestRegistry(silentLogger, fullySeededStore())

    await registry.recordChecked()

    expect(publishDataChange).toHaveBeenCalledExactlyOnceWith(
      announced([], true)
    )
  })

  it('announces a user manifest save and removal by id only', async () => {
    const registry = new ManifestRegistry(silentLogger, fullySeededStore())

    await registry.saveUserManifest(makeManifest('mine:one'), 'create')
    await registry.unregister('mine:one')

    expect(vi.mocked(publishDataChange).mock.calls).toEqual([
      [announced(['mine:one'], false)],
      [announced(['mine:one'], false)],
    ])
  })

  it('stays quiet when a save fails to persist', async () => {
    const store = fullySeededStore()
    vi.spyOn(store, 'setMany').mockRejectedValue(new Error('quota'))
    const registry = new ManifestRegistry(silentLogger, store)

    await expect(
      registry.saveUserManifest(makeManifest('mine:one'), 'create')
    ).rejects.toThrow('quota')

    expect(publishDataChange).not.toHaveBeenCalled()
  })

  it('announces everything changed inside a batch once, when it ends', async () => {
    stubCatalogFetch([catalogEntry('one')], {
      [manifestPath('one')]: makeManifest('one'),
    })
    const registry = new ManifestRegistry(silentLogger, fullySeededStore())

    await registry.batchChanges(async () => {
      await registry.update()
      await registry.saveUserManifest(makeManifest('mine:one'), 'create')
      await registry.recordChecked()
      expect(publishDataChange).not.toHaveBeenCalled()
    })

    expect(publishDataChange).toHaveBeenCalledExactlyOnceWith(
      announced(['one', 'mine:one'], true)
    )
  })

  it('still announces what a failed batch changed', async () => {
    const registry = new ManifestRegistry(silentLogger, fullySeededStore())

    await expect(
      registry.batchChanges(async () => {
        await registry.saveUserManifest(makeManifest('mine:one'), 'create')
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    expect(publishDataChange).toHaveBeenCalledExactlyOnceWith(
      announced(['mine:one'], false)
    )
  })
})
