import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAndCacheFile,
  listCachedFiles,
  type OpfsAdapter,
  type OpfsFileCacheDeps,
  removeCachedFile,
  resetOpfsFileCacheWarnings,
} from './opfsFileCache'

/**
 * Unit tests for the OPFS-backed file cache. Exercises the verified cache hit
 * (no fetch), the cache miss (fetch then write), integrity-mismatch eviction
 * plus re-download, the integrity-failure rejection, the OPFS-unavailable
 * fallback (plain fetch, no caching, warns once), abort, and the no-sha256
 * path, plus listing/eviction of cached files. Uses an in-memory fake OPFS
 * adapter and a stubbed fetch.
 */

const ID = 'asset.bin'
const URL = 'https://example.test/asset.bin'

function bytesFrom(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

function decode(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(new Uint8Array(buffer))
}

type FakeOpfs = OpfsAdapter & { store: Map<string, ArrayBuffer> }

function createFakeOpfs(initial: Record<string, ArrayBuffer> = {}): FakeOpfs {
  const store = new Map<string, ArrayBuffer>(Object.entries(initial))
  return {
    store,
    read: vi.fn(async (name: string) => store.get(name) ?? null),
    write: vi.fn(async (name: string, bytes: ArrayBuffer) => {
      store.set(name, bytes)
    }),
    remove: vi.fn(async (name: string) => {
      store.delete(name)
    }),
    list: vi.fn(async () =>
      [...store.entries()].map(([id, bytes]) => ({
        id,
        sizeBytes: bytes.byteLength,
      }))
    ),
  }
}

function streamResponse(bytes: ArrayBuffer, contentLength?: number): Response {
  const headers = new Headers()
  if (contentLength !== undefined) {
    headers.set('content-length', String(contentLength))
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers })
}

function makeDeps(
  overrides: Partial<OpfsFileCacheDeps> = {}
): OpfsFileCacheDeps {
  return {
    opfs: createFakeOpfs(),
    fetch: vi.fn(),
    digest: vi.fn(async (buffer: ArrayBuffer) => `hash:${decode(buffer)}`),
    requestPersistence: vi.fn(async () => true),
    ...overrides,
  }
}

beforeEach(() => {
  resetOpfsFileCacheWarnings()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchAndCacheFile', () => {
  it('returns cached bytes without fetching on a verified cache hit', async () => {
    const opfs = createFakeOpfs({ [ID]: bytesFrom('cached') })
    const fetchSpy = vi.fn()
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    const result = await fetchAndCacheFile(
      { id: ID, url: URL, sha256: 'hash:cached' },
      deps
    )

    expect(decode(result)).toBe('cached')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(opfs.write).not.toHaveBeenCalled()
  })

  it('fetches, verifies, and writes to OPFS on a cache miss', async () => {
    const opfs = createFakeOpfs()
    const payload = bytesFrom('fresh-bytes')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 11))
    const onProgress = vi.fn()
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    const result = await fetchAndCacheFile(
      { id: ID, url: URL, sha256: 'hash:fresh-bytes', onProgress },
      deps
    )

    expect(decode(result)).toBe('fresh-bytes')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(opfs.write).toHaveBeenCalledTimes(1)
    expect(decode(opfs.store.get(ID) as ArrayBuffer)).toBe('fresh-bytes')
    expect(onProgress).toHaveBeenCalledWith({ loaded: 11, total: 11 })
  })

  it('re-downloads when the cached file fails integrity', async () => {
    const opfs = createFakeOpfs({ [ID]: bytesFrom('corrupt') })
    const payload = bytesFrom('good-bytes')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 10))
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    const result = await fetchAndCacheFile(
      { id: ID, url: URL, sha256: 'hash:good-bytes' },
      deps
    )

    expect(decode(result)).toBe('good-bytes')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(opfs.remove).toHaveBeenCalledWith(ID)
    expect(decode(opfs.store.get(ID) as ArrayBuffer)).toBe('good-bytes')
  })

  it('rejects when freshly fetched bytes fail integrity', async () => {
    const opfs = createFakeOpfs()
    const payload = bytesFrom('wrong-bytes')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 11))
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    await expect(
      fetchAndCacheFile({ id: ID, url: URL, sha256: 'hash:expected' }, deps)
    ).rejects.toThrow('integrity check failed')
    expect(opfs.write).not.toHaveBeenCalled()
  })

  it('falls back to a plain fetch and warns once when OPFS is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const payload = bytesFrom('uncached')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 8))
    const deps = makeDeps({ opfs: null, fetch: fetchSpy })

    const first = await fetchAndCacheFile({ id: ID, url: URL }, deps)
    const second = await fetchAndCacheFile({ id: ID, url: URL }, deps)

    expect(decode(first)).toBe('uncached')
    expect(decode(second)).toBe('uncached')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('aborts an in-flight download via AbortSignal', async () => {
    const opfs = createFakeOpfs()
    const controller = new AbortController()
    controller.abort()
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      return streamResponse(bytesFrom('x'))
    })
    const deps = makeDeps({ opfs, fetch: fetchSpy as unknown as typeof fetch })

    await expect(
      fetchAndCacheFile({ id: ID, url: URL, signal: controller.signal }, deps)
    ).rejects.toThrow('Aborted')
    expect(opfs.write).not.toHaveBeenCalled()
  })

  it('skips integrity verification when no sha256 is provided', async () => {
    const opfs = createFakeOpfs()
    const payload = bytesFrom('unverified')
    const digest = vi.fn(async () => 'unused')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 10))
    const deps = makeDeps({ opfs, fetch: fetchSpy, digest })

    const result = await fetchAndCacheFile({ id: ID, url: URL }, deps)

    expect(decode(result)).toBe('unverified')
    expect(digest).not.toHaveBeenCalled()
  })

  it('lists cached files with sizes', async () => {
    const opfs = createFakeOpfs({
      anime: bytesFrom('1234'),
      modnet: bytesFrom('12'),
    })

    const entries = await listCachedFiles(makeDeps({ opfs }))

    expect(entries).toEqual([
      { id: 'anime', sizeBytes: 4 },
      { id: 'modnet', sizeBytes: 2 },
    ])
  })

  it('returns an empty list when OPFS is unavailable', async () => {
    expect(await listCachedFiles(makeDeps({ opfs: null }))).toEqual([])
  })

  it('evicts a cached file by id', async () => {
    const opfs = createFakeOpfs({ anime: bytesFrom('1234') })

    await removeCachedFile('anime', makeDeps({ opfs }))

    expect(opfs.store.has('anime')).toBe(false)
  })
})
