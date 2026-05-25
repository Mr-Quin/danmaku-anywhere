import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import builtinHanjutv from '../manifests/builtin-hanjutv.json' with {
  type: 'json',
}
import danmuFixture from './fixtures/hanjutv-danmu.json' with { type: 'json' }
import detailFixture from './fixtures/hanjutv-detail.json' with { type: 'json' }
import searchFixture from './fixtures/hanjutv-search.json' with { type: 'json' }

/**
 * Pins the hanjutv reference manifest end-to-end. The search test exercises
 * the AES-CBC sign-on-request path (headers must contain non-empty uk/sign)
 * AND the AES-CBC decrypt-with-no-padding response path (the seriesList
 * arrives base64-encrypted under a key derived from md5(uid + ts) + md5
 * mixed with RESPONSE_SECRET). Episodes and danmaku pipelines run against
 * unencrypted fixtures.
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

describe('builtin:hanjutv manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinHanjutv)).not.toThrow()
  })

  it('search: signs the request and decrypts the no-pad AES response', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://hxqapi.hiyun.tv/api/search/s5?k=%E7%A4%BA%E4%BE%8B&srefer=search_input&type=0&page=1':
        { body: JSON.stringify(searchFixture) },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinHanjutv), {
      fetcher,
    })

    const result = await runner.runSearch({ q: '示例' })

    expect(result).toEqual([
      {
        providerIds: { sid: 'hjtv-12345' },
        indexedId: 'hjtv-12345',
        title: '示例韩剧',
        type: 'tvseries',
        typeDescription: '韩剧',
        imageUrl: 'https://hxqapi.hiyun.tv/asset/12345/poster.jpg',
        episodeCount: 0,
        year: null,
      },
      {
        providerIds: { sid: 'hjtv-67890' },
        indexedId: 'hjtv-67890',
        title: '第二韩剧',
        type: 'tvseries',
        typeDescription: '韩剧',
        imageUrl: 'https://hxqapi.hiyun.tv/asset/67890/poster.jpg',
        episodeCount: 0,
        year: null,
      },
    ])
    expect(calls).toHaveLength(1)
    const sentHeaders = (calls[0]?.init as { headers?: Record<string, string> })
      .headers
    // uk + sign are AES outputs (non-empty base64). Pin shape so a future
    // change that silently drops the encrypt helper fails this test rather
    // than just failing live.
    expect(sentHeaders?.uk).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect((sentHeaders?.uk ?? '').length).toBeGreaterThan(16)
    expect(sentHeaders?.sign).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect((sentHeaders?.sign ?? '').length).toBeGreaterThan(64)
    expect(sentHeaders?.said).toBe('fb3597b87601d5a7')
    expect(sentHeaders?.app).toBe('hj')
  })

  it('episodes: maps playItems to canonical entries, falling back when title is empty', async () => {
    const { fetcher } = mockFetcher({
      'https://hxqapi.hiyun.tv/api/series/detail?sid=hjtv-12345': {
        body: JSON.stringify(detailFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinHanjutv), {
      fetcher,
    })

    const result = await runner.runEpisodes({ sid: 'hjtv-12345' })

    expect(result).toEqual([
      {
        providerIds: { sid: 'hjtv-12345', pid: 'hjtv-ep-001' },
        indexedId: 'hjtv-ep-001',
        title: '首集',
        episodeNumber: '1',
      },
      {
        providerIds: { sid: 'hjtv-12345', pid: 'hjtv-ep-002' },
        indexedId: 'hjtv-ep-002',
        title: '第2集',
        episodeNumber: '2',
      },
      {
        providerIds: { sid: 'hjtv-12345', pid: 'hjtv-ep-003' },
        indexedId: 'hjtv-ep-003',
        title: '第三集',
        episodeNumber: '3',
      },
    ])
  })

  it('danmaku: emits canonical {cid, p, m} entries with type-2 collapsed to 5', async () => {
    const handlers: Record<string, MockResponse> = {}
    for (let i = 0; i < 30; i++) {
      const fromAxis = i * 60000
      const toAxis = (i + 1) * 60000
      const url = `https://hxqapi.hiyun.tv/api/danmu/playItem/list?pid=hjtv-ep-001&prevId=0&fromAxis=${fromAxis}&toAxis=${toAxis}&offset=0`
      // Only the first segment carries danmus; the rest return empty pages.
      handlers[url] = {
        body:
          i === 0
            ? JSON.stringify(danmuFixture)
            : JSON.stringify({ danmus: [] }),
      }
    }
    const { fetcher } = mockFetcher(handlers)
    const runner = new ManifestRunner(zManifest.parse(builtinHanjutv), {
      fetcher,
    })

    const result = await runner.runDanmaku({ pid: 'hjtv-ep-001' })

    expect(result).toEqual([
      { cid: 1001, p: '1.5,1,16777215', m: 'hello' },
      { cid: 1002, p: '2.5,5,16711680', m: 'bottom red' },
    ])
  })
})
