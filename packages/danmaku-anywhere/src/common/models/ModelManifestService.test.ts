import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { BASELINE_MANIFEST } from './baseline'
import {
  type ModelManifestIo,
  ModelManifestService,
} from './ModelManifestService'

/**
 * Exercises ModelManifestService resolution: a fresh cache short-circuits the
 * network, a stale or absent cache triggers a fetch, an HTTP error or invalid
 * payload falls back to the cached-then-baseline manifest, a successful fetch is
 * written back to the cache, and resolveModel falls back to the default id when
 * a saved id is missing. IO is faked so no real network or storage is touched.
 */

function makeLogger(): ILogger {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    sub: () => logger,
  } as unknown as ILogger
  return logger
}

const remoteManifest = {
  version: 2,
  models: [
    {
      id: 'people',
      label: { en: 'People', zh: '真人' },
      runtime: 'mediapipe',
      delivery: 'bundled',
      inputSize: 256,
      requiresWebGpu: false,
    },
    {
      id: 'fast-anime',
      label: { en: 'Fast Anime', zh: '快速动画' },
      runtime: 'ort',
      delivery: 'hosted',
      url: 'https://example.test/fast.onnx',
      inputSize: 256,
      requiresWebGpu: true,
    },
  ],
}

function makeIo(overrides: Partial<ModelManifestIo> = {}): ModelManifestIo {
  return {
    fetch: vi.fn(),
    now: () => 1_000_000,
    readCache: vi.fn().mockResolvedValue(null),
    writeCache: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

let logger: ILogger

beforeEach(() => {
  logger = makeLogger()
})

describe('ModelManifestService', () => {
  it('fetches and caches the remote manifest when no cache exists', async () => {
    const io = makeIo({
      fetch: vi.fn().mockResolvedValue(jsonResponse(remoteManifest)),
    })
    const service = new ModelManifestService(logger, io)

    const models = await service.listModels()

    expect(models.map((m) => m.id)).toEqual(['people', 'fast-anime'])
    expect(io.fetch).toHaveBeenCalledTimes(1)
    expect(io.writeCache).toHaveBeenCalledWith({
      manifest: expect.objectContaining({ version: 2 }),
      fetchedAt: 1_000_000,
    })
  })

  it('uses a fresh cached manifest without fetching', async () => {
    const io = makeIo({
      fetch: vi.fn(),
      now: () => 1_000_000,
      readCache: vi
        .fn()
        .mockResolvedValue({ manifest: remoteManifest, fetchedAt: 999_000 }),
    })
    const service = new ModelManifestService(logger, io)

    const models = await service.listModels()

    expect(models.map((m) => m.id)).toEqual(['people', 'fast-anime'])
    expect(io.fetch).not.toHaveBeenCalled()
  })

  it('refetches when the cached manifest is older than the TTL', async () => {
    const io = makeIo({
      fetch: vi.fn().mockResolvedValue(jsonResponse(remoteManifest)),
      now: () => 100 * 60 * 60 * 1000,
      readCache: vi
        .fn()
        .mockResolvedValue({ manifest: BASELINE_MANIFEST, fetchedAt: 0 }),
    })
    const service = new ModelManifestService(logger, io)

    await service.listModels()

    expect(io.fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the baseline when the fetch fails and no cache exists', async () => {
    const io = makeIo({
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
    })
    const service = new ModelManifestService(logger, io)

    const models = await service.listModels()

    expect(models.map((m) => m.id)).toEqual(
      BASELINE_MANIFEST.models.map((m) => m.id)
    )
  })

  it('falls back to the stale cache when the fetch fails', async () => {
    const io = makeIo({
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
      now: () => 100 * 60 * 60 * 1000,
      readCache: vi
        .fn()
        .mockResolvedValue({ manifest: remoteManifest, fetchedAt: 0 }),
    })
    const service = new ModelManifestService(logger, io)

    const models = await service.listModels()

    expect(models.map((m) => m.id)).toEqual(['people', 'fast-anime'])
  })

  it('falls back to the baseline when the remote payload is invalid', async () => {
    const io = makeIo({
      fetch: vi
        .fn()
        .mockResolvedValue(jsonResponse({ version: 1, models: [] })),
    })
    const service = new ModelManifestService(logger, io)

    const models = await service.listModels()

    expect(models.map((m) => m.id)).toEqual(
      BASELINE_MANIFEST.models.map((m) => m.id)
    )
  })

  it('resolves a missing id to the default model', async () => {
    const io = makeIo({
      fetch: vi.fn().mockResolvedValue(jsonResponse(remoteManifest)),
    })
    const service = new ModelManifestService(logger, io)

    const resolved = await service.resolveModel('does-not-exist')

    expect(resolved.id).toBe('people')
  })

  it('forces a re-fetch on refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(remoteManifest))
    const io = makeIo({
      fetch: fetchMock,
      readCache: vi
        .fn()
        .mockResolvedValue({ manifest: remoteManifest, fetchedAt: 1_000_000 }),
    })
    const service = new ModelManifestService(logger, io)

    await service.listModels()
    expect(fetchMock).not.toHaveBeenCalled()

    await service.refresh()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
