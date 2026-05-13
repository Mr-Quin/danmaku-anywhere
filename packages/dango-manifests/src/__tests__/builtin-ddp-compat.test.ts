import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import builtinDdpCompat from '../manifests/builtin-ddp-compat.json' with {
  type: 'json',
}
import bangumiFixture from './fixtures/ddp-compat-bangumi.json' with {
  type: 'json',
}
import commentsFixture from './fixtures/ddp-compat-comments.json' with {
  type: 'json',
}
import searchFixture from './fixtures/ddp-compat-search.json' with {
  type: 'json',
}

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

const BASE = 'https://my-server.com'

describe('builtin:ddp-compat manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinDdpCompat)).not.toThrow()
  })

  it('runs search against a user-supplied baseUrl and maps to canonical shape', async () => {
    const { fetcher, calls } = mockFetcher({
      [`${BASE}/v2/search/anime?keyword=show`]: {
        body: JSON.stringify(searchFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDdpCompat), {
      fetcher,
    })

    const result = await runner.runSearch({
      q: 'show',
      baseUrl: BASE,
      authHeaders: [],
    })

    expect(result).toEqual([
      {
        providerIds: { animeId: 991, bangumiId: 'compat-991' },
        indexedId: '991',
        title: 'Self-Hosted Show',
        type: 'tvseries',
        typeDescription: 'TV动画',
        imageUrl: 'https://my-server.com/img/991.jpg',
        episodeCount: 12,
        year: 2024,
      },
    ])

    expect(calls).toHaveLength(1)
    const init = calls[0].init as { headers?: Record<string, string> }
    expect(init.headers).toEqual({})
  })

  it('strips a trailing slash from baseUrl', async () => {
    const { fetcher, calls } = mockFetcher({
      [`${BASE}/v2/search/anime?keyword=show`]: {
        body: JSON.stringify(searchFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDdpCompat), {
      fetcher,
    })

    await runner.runSearch({
      q: 'show',
      baseUrl: `${BASE}/`,
      authHeaders: [],
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${BASE}/v2/search/anime?keyword=show`)
  })

  it('attaches user-supplied auth headers to outgoing requests', async () => {
    const { fetcher, calls } = mockFetcher({
      [`${BASE}/v2/search/anime?keyword=show`]: {
        body: JSON.stringify(searchFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDdpCompat), {
      fetcher,
    })

    await runner.runSearch({
      q: 'show',
      baseUrl: BASE,
      authHeaders: [
        { key: 'X-Token', value: 'abc123' },
        { key: 'X-Tenant', value: 'team42' },
      ],
    })

    const init = calls[0].init as { headers?: Record<string, string> }
    expect(init.headers).toEqual({
      'X-Token': 'abc123',
      'X-Tenant': 'team42',
    })
  })

  it('runs the episodes pipeline and maps to canonical shape', async () => {
    const { fetcher } = mockFetcher({
      [`${BASE}/v2/bangumi/compat-991`]: {
        body: JSON.stringify(bangumiFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDdpCompat), {
      fetcher,
    })

    const result = await runner.runEpisodes({
      bangumiId: 'compat-991',
      baseUrl: BASE,
      authHeaders: [],
    })

    expect(result).toEqual([
      {
        providerIds: {
          episodeId: 9910001,
          animeId: 991,
          bangumiId: 'compat-991',
        },
        indexedId: '9910001',
        title: 'EP1',
        episodeNumber: '1',
      },
      {
        providerIds: {
          episodeId: 9910002,
          animeId: 991,
          bangumiId: 'compat-991',
        },
        indexedId: '9910002',
        title: 'EP2',
        episodeNumber: '2',
      },
    ])
  })

  it('runs the danmaku pipeline and emits {cid, p, m} entries', async () => {
    const { fetcher, calls } = mockFetcher({
      [`${BASE}/v2/comment/9910001?withRelated=false`]: {
        body: JSON.stringify(commentsFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinDdpCompat), {
      fetcher,
    })

    const result = await runner.runDanmaku({
      episodeId: 9910001,
      baseUrl: BASE,
      authHeaders: [],
    })

    expect(result).toEqual([
      { cid: 91000001, p: '10.50,1,16777215,abcdef01', m: 'self-host 1' },
      { cid: 91000002, p: '20.75,4,16711680,abcdef02', m: 'self-host 2' },
    ])
    expect(calls[0].url).toBe(`${BASE}/v2/comment/9910001?withRelated=false`)
  })
})
