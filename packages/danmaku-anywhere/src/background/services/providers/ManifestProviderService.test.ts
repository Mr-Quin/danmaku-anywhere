import type { ManifestRunner } from '@danmaku-anywhere/dango'
import {
  type CommentEntity,
  DanmakuSourceType,
  EPISODE_SCHEMA_VERSION,
  SEASON_SCHEMA_VERSION,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it, vi } from 'vitest'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import type { ILogger } from '@/common/Logger'
import { ManifestProviderService } from './ManifestProviderService'
import type { ManifestRegistry } from './ManifestRegistry'

/**
 * Covers ManifestProviderService's host-side responsibilities:
 * threading `extraInputs` into every pipeline run, applying `stripHtml`
 * + canonical provider fields to search/episodes output, and routing
 * danmaku output through `commentMapper` (or identity passthrough).
 */

function makeRunner(returns: Record<string, unknown>): ManifestRunner {
  return {
    runSearch: vi.fn(async () => returns.search ?? []),
    runEpisodes: vi.fn(async () => returns.episodes ?? []),
    runDanmaku: vi.fn(async () => returns.danmaku ?? []),
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
        manifestId: 'builtin:bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'builtin:bilibili',
        commentMapper: (raw) => raw as CommentEntity[],
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
      providerConfigId: 'builtin:bilibili',
      schemaVersion: SEASON_SCHEMA_VERSION,
    })
    expect(runner.runSearch).toHaveBeenCalledWith({ q: 'frieren' })
  })

  it('merges extraInputs into the search pipeline inputs', async () => {
    const runner = makeRunner({ search: [] })
    const svc = new ManifestProviderService(
      {
        manifestId: 'builtin:ddp-compat',
        provider: DanmakuSourceType.DanDanPlay,
        providerConfigId: 'compat-1',
        extraInputs: () => ({
          baseUrl: 'https://compat.example',
          authHeaders: [],
        }),
        commentMapper: (raw) => raw as CommentEntity[],
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
        manifestId: 'builtin:bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'builtin:bilibili',
        commentMapper: (raw) => raw as CommentEntity[],
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

  it('runs commentMapper as identity for sources whose pipeline already emits CommentEntity', async () => {
    const raw: CommentEntity[] = [{ cid: 1, p: '1,1,16777215', m: 'hi' }]
    const runner = makeRunner({ danmaku: raw })
    const svc = new ManifestProviderService(
      {
        manifestId: 'builtin:dandanplay',
        provider: DanmakuSourceType.DanDanPlay,
        providerConfigId: 'builtin:dandanplay',
        commentMapper: (input) => input as CommentEntity[],
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.getDanmaku(makeRequest({ episodeId: 42 }))

    expect(result).toBe(raw)
    expect(runner.runDanmaku).toHaveBeenCalledWith({ episodeId: 42 })
  })

  it('routes raw output through commentMapper when configured', async () => {
    const runner = makeRunner({
      danmaku: [{ progress: 1000, mode: 1, color: 16777215, content: 'hi' }],
    })
    const mapper = vi.fn((raw: unknown): CommentEntity[] =>
      (raw as Array<{ content: string }>).map((r) => ({
        p: '1,1,16777215',
        m: r.content,
      }))
    )
    const svc = new ManifestProviderService(
      {
        manifestId: 'builtin:bilibili',
        provider: DanmakuSourceType.Bilibili,
        providerConfigId: 'builtin:bilibili',
        commentMapper: mapper,
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.getDanmaku(makeRequest({ cid: 555 }))

    expect(mapper).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ p: '1,1,16777215', m: 'hi' }])
  })
})
