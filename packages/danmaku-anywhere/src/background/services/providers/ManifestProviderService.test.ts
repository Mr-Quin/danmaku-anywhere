import {
  type CommentEntity,
  DanmakuSourceType,
  EPISODE_SCHEMA_VERSION,
  SEASON_SCHEMA_VERSION,
} from '@danmaku-anywhere/danmaku-converter'
import type { ManifestRunner } from '@mr-quin/dango'
import { describe, expect, it, vi } from 'vitest'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import type { ILogger } from '@/common/Logger'
import { ManifestProviderService } from './ManifestProviderService'
import type { ManifestRegistry } from './ManifestRegistry'

/**
 * Covers ManifestProviderService's host-side responsibilities: applying
 * `stripHtml` + canonical provider fields to search/episodes output and
 * forwarding danmaku pipeline output (already CommentEntity-shaped) to
 * the caller. Input precedence is exercised via the configValues path.
 */

function makeRunner(returns: Record<string, unknown>): ManifestRunner {
  return {
    runSearch: vi.fn(async () => returns.search ?? []),
    runEpisodes: vi.fn(async () => returns.episodes ?? []),
    runDanmaku: vi.fn(async () => returns.danmaku ?? []),
    runSeason: vi.fn(async () => returns.season ?? null),
    hasSeason: vi.fn(() => 'season' in returns),
    configDefaults: vi.fn(
      () => (returns.configDefaults as Record<string, unknown>) ?? {}
    ),
  } as unknown as ManifestRunner
}

function makeRegistry(runner: ManifestRunner): ManifestRegistry {
  return {
    getRunner: vi.fn(() => runner),
  } as unknown as ManifestRegistry
}

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

describe('ManifestProviderService.search', () => {
  it('adds provider / providerConfigId / schemaVersion and strips html on titles', async () => {
    const runner = makeRunner({
      search: [
        {
          providerIds: { seasonId: 123 },
          indexedId: '123',
          title: '<em>Frieren</em>',
          type: 'tv',
          imageUrl: 'https://x',
          episodeCount: 28,
          year: 2023,
        },
      ],
    })
    const svc = new ManifestProviderService(
      {
        manifestId: 'bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'bilibili',
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.search({ keyword: 'frieren' })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      providerIds: { seasonId: 123 },
      title: 'Frieren',
      provider: DanmakuSourceType.Bilibili,
      providerConfigId: 'bilibili',
      schemaVersion: SEASON_SCHEMA_VERSION,
    })
    expect(runner.runSearch).toHaveBeenCalledWith({ q: 'frieren' })
  })

  it('merges configValues into the search pipeline inputs', async () => {
    const runner = makeRunner({ search: [] })
    const svc = new ManifestProviderService(
      {
        manifestId: 'dandanplay',
        provider: DanmakuSourceType.DanDanPlay,
        providerConfigId: 'custom-ddp-1',
        configValues: {
          baseUrl: 'https://compat.example',
          authHeaders: [],
        },
      },
      makeRegistry(runner),
      silentLogger
    )

    await svc.search({ keyword: 'x' })

    expect(runner.runSearch).toHaveBeenCalledWith({
      q: 'x',
      baseUrl: 'https://compat.example',
      authHeaders: [],
    })
  })
})

describe('ManifestProviderService.getSeason', () => {
  it('returns null when the manifest does not declare a season pipeline', async () => {
    const runner = makeRunner({})
    const svc = new ManifestProviderService(
      {
        manifestId: 'tencent',
        provider: DanmakuSourceType.Tencent,
        providerConfigId: 'tencent',
      },
      makeRegistry(runner),
      silentLogger
    )
    expect(await svc.getSeason({ cid: 'x' })).toBeNull()
  })

  it('runs the season pipeline and maps to a canonical SeasonInsert', async () => {
    const runner = makeRunner({
      season: {
        providerIds: { seasonId: 41410 },
        indexedId: '41410',
        title: '<b>新标题</b>',
        type: 'tv',
        imageUrl: 'https://x',
        episodeCount: 12,
      },
    })
    const svc = new ManifestProviderService(
      {
        manifestId: 'bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'bilibili',
      },
      makeRegistry(runner),
      silentLogger
    )
    const result = await svc.getSeason({ seasonId: 41410 })
    expect(result).toMatchObject({
      providerIds: { seasonId: 41410 },
      title: '新标题',
      provider: DanmakuSourceType.Bilibili,
      providerConfigId: 'bilibili',
      schemaVersion: SEASON_SCHEMA_VERSION,
    })
    expect(runner.runSeason).toHaveBeenCalledWith({ seasonId: 41410 })
  })

  it('returns null when the season pipeline yields null', async () => {
    const runner = makeRunner({ season: null })
    const svc = new ManifestProviderService(
      {
        manifestId: 'bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'bilibili',
      },
      makeRegistry(runner),
      silentLogger
    )
    expect(await svc.getSeason({ seasonId: 999 })).toBeNull()
  })
})

describe('ManifestProviderService.getEpisodes', () => {
  it('adds provider / schemaVersion / lastChecked and strips html on titles', async () => {
    const runner = makeRunner({
      episodes: [
        {
          providerIds: { cid: 555 },
          indexedId: '555',
          title: '<b>Episode 1</b>',
        },
      ],
    })
    const svc = new ManifestProviderService(
      {
        manifestId: 'bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'bilibili',
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.getEpisodes({ seasonId: 123 })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      providerIds: { cid: 555 },
      title: 'Episode 1',
      provider: DanmakuSourceType.Bilibili,
      schemaVersion: EPISODE_SCHEMA_VERSION,
    })
    expect(typeof result[0].lastChecked).toBe('number')
    expect(runner.runEpisodes).toHaveBeenCalledWith({ seasonId: 123 })
  })
})

describe('ManifestProviderService.getDanmaku', () => {
  function makeRequest(
    providerIds: Record<string, unknown>
  ): DanmakuFetchByMeta {
    return {
      type: 'by-meta',
      meta: {
        season: {} as DanmakuFetchByMeta['meta']['season'],
        provider: DanmakuSourceType.DanDanPlay,
        providerIds,
        title: 'x',
        indexedId: 'x',
        seasonId: 1,
        schemaVersion: EPISODE_SCHEMA_VERSION,
        lastChecked: 0,
      },
    }
  }

  it('forwards the danmaku pipeline output verbatim', async () => {
    const raw: CommentEntity[] = [{ cid: 1, p: '1,1,16777215', m: 'hi' }]
    const runner = makeRunner({ danmaku: raw })
    const svc = new ManifestProviderService(
      {
        manifestId: 'dandanplay',
        provider: DanmakuSourceType.DanDanPlay,
        providerConfigId: 'dandanplay',
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.getDanmaku(makeRequest({ episodeId: 42 }))

    expect(result).toBe(raw)
    expect(runner.runDanmaku).toHaveBeenCalledWith({ episodeId: 42 })
  })
})
