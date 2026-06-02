import { describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { BASELINE_MANIFEST } from './baseline'
import { ModelManifestService } from './ModelManifestService'

/**
 * Exercises ModelManifestService resolution: a successful fetch validates and is
 * served (and cached in memory for the session), a fetch error or invalid
 * payload falls back to the baseline, a failed refresh keeps the manifest
 * already resolved this session, resolveModel falls back to the default id, and
 * lazy loads use the HTTP cache while refresh bypasses it. A fake fetch stands
 * in for the network.
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
      sha256: 'b'.repeat(64),
      inputSize: 256,
      requiresWebGpu: true,
    },
  ],
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function make(fetchFn: typeof fetch) {
  return new ModelManifestService(makeLogger(), fetchFn)
}

describe('ModelManifestService', () => {
  it('fetches and validates the remote manifest', async () => {
    const service = make(
      vi.fn().mockResolvedValue(jsonResponse(remoteManifest))
    )

    expect((await service.listModels()).map((m) => m.id)).toEqual([
      'people',
      'fast-anime',
    ])
  })

  it('caches the manifest in memory for the session', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(remoteManifest))
    const service = make(fetchFn)

    await service.listModels()
    await service.getModel('people')

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('lazy loads ride the HTTP cache; refresh bypasses it', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(remoteManifest))
    const service = make(fetchFn)

    await service.listModels()
    expect(fetchFn.mock.calls[0][0]).toBe(
      'https://assets.danmaku.weeblify.app/models/manifest.json'
    )
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ cache: 'default' })

    await service.refresh()
    expect(fetchFn.mock.calls[1][0]).toMatch(/\?t=\d+$/)
    expect(fetchFn.mock.calls[1][1]).toMatchObject({ cache: 'no-store' })
  })

  it('falls back to the baseline when the fetch fails', async () => {
    const service = make(vi.fn().mockRejectedValue(new Error('offline')))

    expect((await service.listModels()).map((m) => m.id)).toEqual(
      BASELINE_MANIFEST.models.map((m) => m.id)
    )
  })

  it('falls back to the baseline when the payload is invalid', async () => {
    const service = make(
      vi.fn().mockResolvedValue(jsonResponse({ version: 1, models: [] }))
    )

    expect((await service.listModels()).map((m) => m.id)).toEqual(
      BASELINE_MANIFEST.models.map((m) => m.id)
    )
  })

  it('keeps the session manifest when a refresh fails', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(remoteManifest))
      .mockRejectedValueOnce(new Error('offline'))
    const service = make(fetchFn)

    await service.listModels()
    const afterRefresh = await service.refresh()

    expect(afterRefresh.map((m) => m.id)).toEqual(['people', 'fast-anime'])
  })

  it('resolves a missing id to the default model', async () => {
    const service = make(
      vi.fn().mockResolvedValue(jsonResponse(remoteManifest))
    )

    expect((await service.resolveModel('does-not-exist')).id).toBe('people')
  })
})
