import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchModelWithCache,
  type ModelCacheDeps,
  type OpfsAdapter,
  resetModelCacheWarnings,
} from './modelCache'

/**
 * Unit tests for the OPFS-backed model cache. Exercises the verified cache hit
 * (no fetch), the cache miss (fetch then write), integrity-mismatch eviction
 * plus re-download, and the OPFS-unavailable fallback (plain fetch, no caching,
 * warns once). Uses an in-memory fake OPFS adapter and a stubbed fetch.
 */

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

function makeDeps(overrides: Partial<ModelCacheDeps> = {}): ModelCacheDeps {
  return {
    opfs: createFakeOpfs(),
    fetch: vi.fn(),
    digest: vi.fn(async (buffer: ArrayBuffer) => `hash:${decode(buffer)}`),
    requestPersistence: vi.fn(async () => true),
    ...overrides,
  }
}

beforeEach(() => {
  resetModelCacheWarnings()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchModelWithCache', () => {
  it('returns cached bytes without fetching on a verified cache hit', async () => {
    const opfs = createFakeOpfs({ 'anime-isnet': bytesFrom('cached-model') })
    const fetchSpy = vi.fn()
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    const result = await fetchModelWithCache(
      {
        id: 'anime-isnet',
        url: 'https://example.test/anime-isnet.onnx',
        sha256: 'hash:cached-model',
      },
      deps
    )

    expect(decode(result)).toBe('cached-model')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(opfs.write).not.toHaveBeenCalled()
  })

  it('fetches, verifies, and writes to OPFS on a cache miss', async () => {
    const opfs = createFakeOpfs()
    const payload = bytesFrom('fresh-model')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 11))
    const onProgress = vi.fn()
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    const result = await fetchModelWithCache(
      {
        id: 'anime-isnet',
        url: 'https://example.test/anime-isnet.onnx',
        sha256: 'hash:fresh-model',
        onProgress,
      },
      deps
    )

    expect(decode(result)).toBe('fresh-model')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(opfs.write).toHaveBeenCalledTimes(1)
    expect(decode(opfs.store.get('anime-isnet') as ArrayBuffer)).toBe(
      'fresh-model'
    )
    expect(onProgress).toHaveBeenCalledWith({ loaded: 11, total: 11 })
  })

  it('re-downloads when the cached file fails integrity', async () => {
    const opfs = createFakeOpfs({ 'anime-isnet': bytesFrom('corrupt') })
    const payload = bytesFrom('good-model')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 10))
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    const result = await fetchModelWithCache(
      {
        id: 'anime-isnet',
        url: 'https://example.test/anime-isnet.onnx',
        sha256: 'hash:good-model',
      },
      deps
    )

    expect(decode(result)).toBe('good-model')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(opfs.remove).toHaveBeenCalledWith('anime-isnet')
    expect(decode(opfs.store.get('anime-isnet') as ArrayBuffer)).toBe(
      'good-model'
    )
  })

  it('rejects when freshly fetched bytes fail integrity', async () => {
    const opfs = createFakeOpfs()
    const payload = bytesFrom('wrong-model')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 11))
    const deps = makeDeps({ opfs, fetch: fetchSpy })

    await expect(
      fetchModelWithCache(
        {
          id: 'anime-isnet',
          url: 'https://example.test/anime-isnet.onnx',
          sha256: 'hash:expected-model',
        },
        deps
      )
    ).rejects.toThrow('integrity check failed')
    expect(opfs.write).not.toHaveBeenCalled()
  })

  it('falls back to a plain fetch and warns once when OPFS is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const payload = bytesFrom('uncached-model')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 14))
    const deps = makeDeps({ opfs: null, fetch: fetchSpy })

    const first = await fetchModelWithCache(
      { id: 'anime-isnet', url: 'https://example.test/anime-isnet.onnx' },
      deps
    )
    const second = await fetchModelWithCache(
      { id: 'anime-isnet', url: 'https://example.test/anime-isnet.onnx' },
      deps
    )

    expect(decode(first)).toBe('uncached-model')
    expect(decode(second)).toBe('uncached-model')
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
      fetchModelWithCache(
        {
          id: 'anime-isnet',
          url: 'https://example.test/anime-isnet.onnx',
          signal: controller.signal,
        },
        deps
      )
    ).rejects.toThrow('Aborted')
    expect(opfs.write).not.toHaveBeenCalled()
  })

  it('skips integrity verification when no sha256 is provided', async () => {
    const opfs = createFakeOpfs()
    const payload = bytesFrom('unverified-model')
    const digest = vi.fn(async () => 'unused')
    const fetchSpy = vi.fn(async () => streamResponse(payload, 16))
    const deps = makeDeps({ opfs, fetch: fetchSpy, digest })

    const result = await fetchModelWithCache(
      { id: 'anime-isnet', url: 'https://example.test/anime-isnet.onnx' },
      deps
    )

    expect(decode(result)).toBe('unverified-model')
    expect(digest).not.toHaveBeenCalled()
  })
})
