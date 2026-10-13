import {
  type CommentEntity,
  EPISODE_SCHEMA_VERSION,
  SEASON_SCHEMA_VERSION,
} from '@danmaku-anywhere/danmaku-converter'
import type { ManifestRunner } from '@mr-quin/dango'
import { describe, expect, it, vi } from 'vitest'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import type { ILogger } from '@/common/Logger'
import { silentLogger } from '@/tests/silentLogger'
import {
  DANMAKU_RUN_OPTIONS,
  MANIFEST_RUN_OPTIONS,
  ManifestProviderService,
} from './ManifestProviderService'
import type { ManifestRegistry } from './ManifestRegistry'
import { ManifestOutputError } from './manifestErrors'

/**
 * Covers ManifestProviderService's host-side responsibilities: applying
 * `stripHtml` + canonical provider fields to search/episodes output and
 * validating danmaku pipeline output against the comment schema before it
 * reaches the caller. Input precedence is exercised via the configValues path.
 */

const RUN_OPTS = MANIFEST_RUN_OPTIONS

function makeRunner(returns: Record<string, unknown>): ManifestRunner {
  return {
    runSearch: vi.fn(async () => returns.search ?? []),
    runEpisodes: vi.fn(async () => returns.episodes ?? []),
    runDanmaku: vi.fn(async () => returns.danmaku ?? []),
    runSeason: vi.fn(async () => ('season' in returns ? returns.season : null)),
    runParseUrl: vi.fn(async () =>
      'parseUrl' in returns ? returns.parseUrl : null
    ),
    hasSeason: vi.fn(() => 'season' in returns),
    configDefaults: vi.fn(
      () => (returns.configDefaults as Record<string, unknown>) ?? {}
    ),
  } as unknown as ManifestRunner // lint-specs-allow-cast: ManifestRunner (from @mr-quin/dango) has private fields; double only implements the methods this suite exercises
}

function makeRegistry(runner: ManifestRunner): ManifestRegistry {
  return {
    ready: Promise.resolve(),
    getRunner: vi.fn<ManifestRegistry['getRunner']>(() => runner),
  } as unknown as ManifestRegistry // lint-specs-allow-cast: ManifestRegistry has private fields; double only implements ready and getRunner
}

function makeService(returns: Record<string, unknown>): {
  svc: ManifestProviderService
  warn: ReturnType<typeof vi.fn>
} {
  const warn = vi.fn()
  const logger = { ...silentLogger, warn } satisfies ILogger
  const svc = new ManifestProviderService(
    { manifestId: 'acme', providerConfigId: 'acme-1' },
    makeRegistry(makeRunner(returns)),
    logger
  )
  return { svc, warn }
}

const seasonRow = {
  providerIds: { seasonId: 1 },
  indexedId: '1',
  title: 'Season',
  type: 'tv',
}

const episodeRow = {
  providerIds: { cid: 2 },
  indexedId: '2',
  title: 'Episode',
}

describe('ManifestProviderService.search', () => {
  it('adds manifestId / providerConfigId / schemaVersion and strips html on titles', async () => {
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
      manifestId: 'bilibili',
      providerConfigId: 'bilibili',
      schemaVersion: SEASON_SCHEMA_VERSION,
    })
    expect(runner.runSearch).toHaveBeenCalledWith({ q: 'frieren' }, RUN_OPTS)
  })

  it('merges configValues into the search pipeline inputs', async () => {
    const runner = makeRunner({ search: [] })
    const svc = new ManifestProviderService(
      {
        manifestId: 'dandanplay',
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

    expect(runner.runSearch).toHaveBeenCalledWith(
      {
        q: 'x',
        baseUrl: 'https://compat.example',
        authHeaders: [],
      },
      RUN_OPTS
    )
  })
})

describe('ManifestProviderService.search output validation', () => {
  it('drops a row with a numeric indexedId and keeps the rest', async () => {
    const { svc, warn } = makeService({
      search: [seasonRow, { ...seasonRow, indexedId: 123 }],
    })

    const result = await svc.search({ keyword: 'x' })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ indexedId: '1' })
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Dropped 1 of 2 search row\(s\) from manifest acme, first: \[1\] indexedId: /
      )
    )
  })

  it('fails when every row is invalid', async () => {
    const { svc } = makeService({
      search: [{ ...seasonRow, indexedId: 123 }],
    })

    await expect(svc.search({ keyword: 'x' })).rejects.toThrow(
      ManifestOutputError
    )
    await expect(svc.search({ keyword: 'x' })).rejects.toThrow(
      /^Manifest acme search output has no valid rows \(1 invalid\), first: \[0\] indexedId: /
    )
  })

  it('fails when the output is not an array', async () => {
    const { svc } = makeService({ search: { rows: [] } })

    await expect(svc.search({ keyword: 'x' })).rejects.toThrow(
      'Manifest acme search output is not an array, got object'
    )
  })

  it('leaves out a type the row does not have', async () => {
    const { type: _type, ...untyped } = seasonRow
    const { svc } = makeService({ search: [untyped] })

    const [season] = await svc.search({ keyword: 'x' })

    expect(season).not.toHaveProperty('type')
  })

  it('copies only the season fields the host stores', async () => {
    const { svc } = makeService({
      search: [{ ...seasonRow, id: 5, imageUrl: undefined, extra: 'x' }],
    })

    const [season] = await svc.search({ keyword: 'x' })

    expect(season).toEqual({
      providerIds: { seasonId: 1 },
      indexedId: '1',
      title: 'Season',
      type: 'tv',
      manifestId: 'acme',
      providerConfigId: 'acme-1',
      schemaVersion: SEASON_SCHEMA_VERSION,
    })
  })
})

describe('ManifestProviderService.getSeason', () => {
  it('returns null when the manifest does not declare a season pipeline', async () => {
    const runner = makeRunner({})
    const svc = new ManifestProviderService(
      {
        manifestId: 'tencent',
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
        providerConfigId: 'bilibili',
      },
      makeRegistry(runner),
      silentLogger
    )
    const result = await svc.getSeason({ seasonId: 41410 })
    expect(result).toMatchObject({
      providerIds: { seasonId: 41410 },
      title: '新标题',
      manifestId: 'bilibili',
      providerConfigId: 'bilibili',
      schemaVersion: SEASON_SCHEMA_VERSION,
    })
    expect(runner.runSeason).toHaveBeenCalledWith({ seasonId: 41410 }, RUN_OPTS)
  })

  it('returns null when the season pipeline yields nothing', async () => {
    const { svc } = makeService({ season: undefined })

    expect(await svc.getSeason({ seasonId: 999 })).toBeNull()
  })

  it('fails on a season row that breaks the contract', async () => {
    const { svc } = makeService({ season: { ...seasonRow, providerIds: 1 } })

    await expect(svc.getSeason({ seasonId: 1 })).rejects.toMatchObject({
      name: 'ManifestOutputError',
      reason: 'invalid-output',
      manifestId: 'acme',
      providerConfigId: 'acme-1',
      pipeline: 'season',
    })
    await expect(svc.getSeason({ seasonId: 1 })).rejects.toThrow(
      /^Manifest acme season output is invalid, providerIds: /
    )
  })

  it('returns null when the season pipeline yields null', async () => {
    const runner = makeRunner({ season: null })
    const svc = new ManifestProviderService(
      {
        manifestId: 'bilibili',
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
      schemaVersion: EPISODE_SCHEMA_VERSION,
    })
    expect(typeof result[0].lastChecked).toBe('number')
    expect(runner.runEpisodes).toHaveBeenCalledWith({ seasonId: 123 }, RUN_OPTS)
  })
})

describe('ManifestProviderService.getEpisodes output validation', () => {
  it('drops an episode without a title and keeps the rest', async () => {
    const { title: _title, ...untitled } = episodeRow
    const { svc, warn } = makeService({ episodes: [episodeRow, untitled] })

    const result = await svc.getEpisodes({ seasonId: 1 })

    expect(result).toHaveLength(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Dropped 1 of 2 episodes row\(s\) from manifest acme, first: \[1\] title: /
      )
    )
  })

  it('copies only the episode fields the host stores', async () => {
    const { svc } = makeService({
      episodes: [{ ...episodeRow, id: 5, seasonId: 9, episodeNumber: 3 }],
    })

    const [episode] = await svc.getEpisodes({ seasonId: 1 })

    expect(episode).not.toHaveProperty('id')
    expect(episode).not.toHaveProperty('seasonId')
    expect(episode).toMatchObject({ indexedId: '2', episodeNumber: 3 })
  })

  it('fails when every episode is invalid', async () => {
    const { svc } = makeService({ episodes: [{ ...episodeRow, indexedId: 2 }] })

    await expect(svc.getEpisodes({ seasonId: 1 })).rejects.toThrow(
      ManifestOutputError
    )
  })

  it('fails when the output is not an array', async () => {
    const { svc } = makeService({ episodes: 'none' })

    await expect(svc.getEpisodes({ seasonId: 1 })).rejects.toThrow(
      'Manifest acme episodes output is not an array, got string'
    )
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
        providerIds,
        title: 'x',
        indexedId: 'x',
        seasonId: 1,
        schemaVersion: EPISODE_SCHEMA_VERSION,
        lastChecked: 0,
      },
    }
  }

  function makeDanmakuService(danmaku: unknown): {
    svc: ManifestProviderService
    warn: ReturnType<typeof vi.fn>
  } {
    const warn = vi.fn()
    const logger = { ...silentLogger, warn } satisfies ILogger
    const svc = new ManifestProviderService(
      {
        manifestId: 'dandanplay',
        providerConfigId: 'dandanplay',
      },
      makeRegistry(makeRunner({ danmaku })),
      logger
    )
    return { svc, warn }
  }

  it('returns the danmaku pipeline output when it is comment-shaped', async () => {
    const raw: CommentEntity[] = [{ cid: 1, p: '1,1,16777215', m: 'hi' }]
    const runner = makeRunner({ danmaku: raw })
    const svc = new ManifestProviderService(
      {
        manifestId: 'dandanplay',
        providerConfigId: 'dandanplay',
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.getDanmaku(makeRequest({ episodeId: 42 }))

    expect(result).toEqual(raw)
    expect(runner.runDanmaku).toHaveBeenCalledWith(
      { episodeId: 42 },
      DANMAKU_RUN_OPTIONS
    )
  })

  it('drops a comment missing its text and keeps the rest', async () => {
    const { svc, warn } = makeDanmakuService([
      { p: '1,1,16777215', m: 'hi' },
      { p: '2,1,16777215' },
      { p: '3,1,16777215', m: 'bye' },
    ])

    const result = await svc.getDanmaku(makeRequest({ episodeId: 42 }))

    expect(result).toEqual([
      { p: '1,1,16777215', m: 'hi' },
      { p: '3,1,16777215', m: 'bye' },
    ])
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Dropped 1 of 3 danmaku row\(s\) from manifest dandanplay, first: \[1\] m: /
      )
    )
  })

  it('drops a comment whose options the renderer cannot parse', async () => {
    const { svc } = makeDanmakuService([
      { p: '1,1,16777215', m: 'hi' },
      { p: 'garbage', m: 'never renders' },
    ])

    const result = await svc.getDanmaku(makeRequest({ episodeId: 42 }))

    expect(result).toEqual([{ p: '1,1,16777215', m: 'hi' }])
  })

  it('keeps an empty result empty instead of failing', async () => {
    const { svc, warn } = makeDanmakuService([])

    expect(await svc.getDanmaku(makeRequest({ episodeId: 42 }))).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('throws when the pipeline emits something that is not an array', async () => {
    const { svc } = makeDanmakuService({ comments: [] })

    await expect(
      svc.getDanmaku(makeRequest({ episodeId: 42 }))
    ).rejects.toThrow(
      'Manifest dandanplay danmaku output is not an array, got object'
    )
  })

  it('throws when every comment in a non-empty batch is malformed', async () => {
    const { svc } = makeDanmakuService([{}, { p: 1 }])

    await expect(
      svc.getDanmaku(makeRequest({ episodeId: 42 }))
    ).rejects.toThrow(
      /^Manifest dandanplay danmaku output has no valid rows \(2 invalid\)/
    )
  })

  it('only the danmaku run tolerates a failed segment', () => {
    expect(DANMAKU_RUN_OPTIONS.continueOnError).toBe(true)
    expect(MANIFEST_RUN_OPTIONS).not.toHaveProperty('continueOnError')
  })
})

describe('ManifestProviderService.parseUrl', () => {
  it('passes the private-host opt-in to the parseUrl pipeline', async () => {
    const runner = makeRunner({
      parseUrl: {
        seasonInsert: {
          providerIds: { seasonId: 1 },
          indexedId: '1',
          title: 'S',
          type: 'tv',
        },
        episodeMeta: {
          providerIds: { cid: 2 },
          indexedId: '2',
          title: 'E',
        },
      },
    })
    const svc = new ManifestProviderService(
      {
        manifestId: 'dandanplay',
        providerConfigId: 'custom-ddp-1',
        configValues: { baseUrl: 'https://my-server/api' },
      },
      makeRegistry(runner),
      silentLogger
    )

    const result = await svc.parseUrl('https://local.example/v/1')

    expect(runner.runParseUrl).toHaveBeenCalledWith(
      'https://local.example/v/1',
      undefined,
      RUN_OPTS
    )
    expect(result?.seasonInsert).toMatchObject({
      manifestId: 'dandanplay',
      providerConfigId: 'custom-ddp-1',
    })
  })

  it('returns null when no URL pattern of the manifest matched', async () => {
    const { svc } = makeService({ parseUrl: null })

    expect(await svc.parseUrl('https://acme.example/v/1')).toBeNull()
  })

  it('fails on a season that breaks the contract', async () => {
    const { svc } = makeService({
      parseUrl: {
        seasonInsert: { ...seasonRow, indexedId: 1 },
        episodeMeta: episodeRow,
      },
    })

    await expect(svc.parseUrl('https://acme.example/v/1')).rejects.toThrow(
      /^Manifest acme parseUrl output is invalid, seasonInsert\.indexedId: /
    )
  })

  it('fails on an episode that breaks the contract', async () => {
    const { svc } = makeService({
      parseUrl: {
        seasonInsert: seasonRow,
        episodeMeta: { ...episodeRow, providerIds: null },
      },
    })

    await expect(svc.parseUrl('https://acme.example/v/1')).rejects.toThrow(
      ManifestOutputError
    )
  })

  it('fails when a matched URL yields nothing', async () => {
    const { svc } = makeService({ parseUrl: undefined })

    await expect(svc.parseUrl('https://acme.example/v/1')).rejects.toThrow(
      ManifestOutputError
    )
  })

  it('fails when the season resolves but the episode does not', async () => {
    const { svc } = makeService({ parseUrl: { seasonInsert: seasonRow } })

    await expect(svc.parseUrl('https://acme.example/v/1')).rejects.toThrow(
      'Could not resolve episode for url: https://acme.example/v/1'
    )
  })
})
