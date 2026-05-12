import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import { builtinDandanplay } from '../index.js'
import bangumiFixture from './fixtures/ddp-bangumi.json' with { type: 'json' }
import commentsFixture from './fixtures/ddp-comments.json' with { type: 'json' }
import searchFixture from './fixtures/ddp-search.json' with { type: 'json' }

interface MockResponse {
  status?: number
  body: string
  headers?: Record<string, string>
}

function mockFetcher(handlers: Record<string, MockResponse>): {
  fetcher: FetchLike
  calls: Array<{ url: string; init?: unknown }>
} {
  const calls: Array<{ url: string; init?: unknown }> = []
  const fetcher: FetchLike = async (input, init) => {
    calls.push({ url: input, init })
    const handler = handlers[input]
    if (handler === undefined) {
      throw new Error(`mockFetcher: no handler for ${input}`)
    }
    const headers = new Map<string, string>(
      Object.entries(handler.headers ?? {})
    )
    return {
      status: handler.status ?? 200,
      text: async () => {
        return handler.body
      },
      bytes: async () => {
        return new TextEncoder().encode(handler.body)
      },
      headers,
    }
  }
  return { fetcher, calls }
}

describe('builtin:dandanplay manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinDandanplay)).not.toThrow()
  })

  it('runs the search pipeline and maps to canonical shape', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.dandanplay.net/api/v2/search/anime?keyword=frieren': {
        body: JSON.stringify(searchFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDandanplay), {
      fetcher,
    })

    const result = await runner.runSearch({ q: 'frieren' })

    expect(result).toEqual([
      {
        providerIds: { animeId: 18398, bangumiId: '400602' },
        indexedId: '18398',
        title: '葬送的芙莉莲',
        type: 'tvseries',
        typeDescription: 'TV动画',
        imageUrl: 'https://img.dandanplay.net/anime/18398.jpg',
        episodeCount: 28,
        year: 2023,
      },
      {
        providerIds: { animeId: 17000, bangumiId: '300000' },
        indexedId: '17000',
        title: 'Cyberpunk: Edgerunners',
        type: 'ova',
        typeDescription: 'OVA',
        imageUrl: 'https://img.dandanplay.net/anime/17000.jpg',
        episodeCount: 10,
        year: 2022,
      },
    ])

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://api.dandanplay.net/api/v2/search/anime?keyword=frieren'
    )
  })

  it('runs the episodes pipeline and maps to canonical shape', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.dandanplay.net/api/v2/bangumi/400602': {
        body: JSON.stringify(bangumiFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDandanplay), {
      fetcher,
    })

    const result = await runner.runEpisodes({ bangumiId: '400602' })

    expect(result).toEqual([
      {
        providerIds: {
          episodeId: 183980001,
          animeId: 18398,
          bangumiId: '400602',
        },
        indexedId: '183980001',
        title: '第1话 旅途的终点',
        episodeNumber: '1',
      },
      {
        providerIds: {
          episodeId: 183980002,
          animeId: 18398,
          bangumiId: '400602',
        },
        indexedId: '183980002',
        title: '第2话 不杀人的魔法',
        episodeNumber: '2',
      },
      {
        providerIds: {
          episodeId: 183980003,
          animeId: 18398,
          bangumiId: '400602',
        },
        indexedId: '183980003',
        title: '第3话 蓝月草',
        episodeNumber: '3',
      },
    ])

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://api.dandanplay.net/api/v2/bangumi/400602'
    )
  })

  it('runs the danmaku pipeline and emits {cid, p, m} entries', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.dandanplay.net/api/v2/comment/183980001?withRelated=false': {
        body: JSON.stringify(commentsFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDandanplay), {
      fetcher,
    })

    const result = await runner.runDanmaku({ episodeId: 183980001 })

    expect(result).toEqual([
      { cid: 1000000001, p: '12.34,1,16777215,abcdef01', m: '弹幕一' },
      { cid: 1000000002, p: '23.45,4,16711680,abcdef02', m: '弹幕二' },
      { cid: 1000000003, p: '34.56,5,65280,abcdef03', m: '底部' },
      { cid: 1000000004, p: '45.67,1,255,abcdef04', m: '蓝色' },
    ])

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://api.dandanplay.net/api/v2/comment/183980001?withRelated=false'
    )
  })
})
