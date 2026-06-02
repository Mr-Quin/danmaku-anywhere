import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import builtinMigu from '../manifests/builtin-migu.json' with { type: 'json' }
import contentInfoFixture from './fixtures/migu-content-info.json' with {
  type: 'json',
}
import danmakuSegments from './fixtures/migu-danmaku-segments.json' with {
  type: 'json',
}
import episodesFixture from './fixtures/migu-episodes.json' with {
  type: 'json',
}
import searchFixture from './fixtures/migu-search.json' with { type: 'json' }

/**
 * Pins the migu reference manifest end-to-end: parse + canonical output for
 * each of the three pipelines. The danmaku test exercises the gatewayDecrypt
 * helper by mocking the live endpoints with ciphertexts captured from the
 * upstream gateway-crypto reference (see fixtures/migu-danmaku-segments.json);
 * the manifest's $gatewayDecrypt + $jsonParse chain must decode them and the
 * output expression must map the canonical {cid, p, m} shape.
 */

interface MockResponse {
  status?: number
  body: string
  headers?: Record<string, string>
}

function mockFetcher(handlers: Record<string, MockResponse>): {
  fetcher: FetchLike
  calls: { url: string; init?: unknown }[]
} {
  const calls: { url: string; init?: unknown }[] = []
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
      text: async () => handler.body,
      bytes: async () => new TextEncoder().encode(handler.body),
      headers,
    }
  }
  return { fetcher, calls }
}

describe('builtin:migu manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinMigu)).not.toThrow()
  })

  it('search: maps long-content matches to canonical shape and drops shorts', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://jadeite.migu.cn/search/v3/open-search': {
        body: JSON.stringify(searchFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinMigu), { fetcher })

    const result = await runner.runSearch({ q: '示例' })

    expect(result).toEqual([
      {
        providerIds: { epsId: '600000010' },
        indexedId: '600000010',
        title: '弹幕示例剧集',
        type: '电视剧',
        typeDescription: '电视剧',
        imageUrl: 'https://img.miguvideo.com/asset/600000001/poster.jpg',
        year: 2024,
      },
      {
        providerIds: { epsId: '600000002' },
        indexedId: '600000002',
        title: '示例电影',
        type: '电影',
        typeDescription: '电影',
        imageUrl: 'https://img.miguvideo.com/asset/600000002/poster.jpg',
        year: 2023,
      },
    ])
    expect(calls).toHaveLength(1)
  })

  it('episodes: maps datas[] to per-episode entries', async () => {
    const { fetcher } = mockFetcher({
      'https://v3-sc.miguvideo.com/program/v4/cont/content-info/600000010/1': {
        body: JSON.stringify(episodesFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinMigu), { fetcher })

    const result = await runner.runEpisodes({ epsId: '600000010' })

    expect(result).toEqual([
      {
        providerIds: { epsId: '600000010', pId: '600000011' },
        indexedId: '600000011',
        title: '第1集',
        episodeNumber: '第1集',
      },
      {
        providerIds: { epsId: '600000010', pId: '600000012' },
        indexedId: '600000012',
        title: '第2集',
        episodeNumber: '第2集',
      },
    ])
  })

  it('danmaku: decrypts gateway-encrypted segments and emits canonical {cid, p, m}', async () => {
    const seg0 = danmakuSegments.segments[0]
    const seg1 = danmakuSegments.segments[1]
    if (!seg0 || !seg1) {
      throw new Error('danmaku fixture is missing expected segments')
    }
    const { fetcher, calls } = mockFetcher({
      'https://v3-sc.miguvideo.com/program/v4/cont/content-info/600000011/1': {
        body: JSON.stringify(contentInfoFixture),
      },
      'https://webapi.miguvideo.com/gateway/live_barrage/videox/barrage/v2/list/600000010/600000011/0/30/020':
        { body: seg0.ct },
      'https://webapi.miguvideo.com/gateway/live_barrage/videox/barrage/v2/list/600000010/600000011/30/45/020':
        { body: seg1.ct },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinMigu), { fetcher })

    const result = await runner.runDanmaku({
      epsId: '600000010',
      pId: '600000011',
    })

    expect(result).toEqual([
      { cid: 900000001, p: '1.50,1,16777215', m: 'hello migu' },
      { cid: 900000002, p: '2.50,1,16711680', m: 'red one' },
      { cid: 900000003, p: '35.00,1,65280', m: 'green two' },
    ])
    // info + 2 segments
    expect(calls).toHaveLength(3)
  })
})
