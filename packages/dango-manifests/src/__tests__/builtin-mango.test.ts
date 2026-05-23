import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import builtinMango from '../manifests/builtin-mango.json' with { type: 'json' }

/**
 * Smoke-tests builtin:mango against zManifest and the canonical output shapes
 * the host expects (indexedId on search/episodes rows; {p, m} on danmaku rows).
 * The dango package owns the broader pipeline-mechanics coverage; this file
 * just confirms the host-facing shape contracts.
 */

interface MockResponse {
  status?: number
  body: string
}

function mockFetcher(
  handlers: Record<string, MockResponse | ((url: string) => MockResponse)>
): { fetcher: FetchLike; calls: Array<{ url: string; init?: unknown }> } {
  const calls: Array<{ url: string; init?: unknown }> = []
  const fetcher: FetchLike = async (input, init) => {
    calls.push({ url: input, init })
    let handler = handlers[input]
    if (handler === undefined) {
      const noQuery = input.split('?')[0]
      handler = handlers[noQuery]
    }
    if (handler === undefined) {
      throw new Error(`mockFetcher: no handler for ${input}`)
    }
    const resp = typeof handler === 'function' ? handler(input) : handler
    return {
      status: resp.status ?? 200,
      text: async () => resp.body,
      bytes: async () => new TextEncoder().encode(resp.body),
      headers: new Map(),
    }
  }
  return { fetcher, calls }
}

const SEARCH_BASE = 'https://mobileso.bz.mgtv.com/msite/search/v2'

describe('builtin:mango manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinMango)).not.toThrow()
  })

  it('emits canonical search rows including indexedId', async () => {
    const { fetcher, calls } = mockFetcher({
      [SEARCH_BASE]: {
        body: JSON.stringify({
          data: {
            contents: [
              {
                type: 'media',
                data: [
                  {
                    source: 'imgo',
                    url: 'https://www.mgtv.com/b/444555/666.html',
                    title: "<em>Frieren</em>: Beyond Journey's End",
                    desc: ['类型:动漫/2023/日本'],
                    img: 'https://example.com/frieren.jpg',
                    videoCount: 28,
                  },
                ],
              },
            ],
          },
        }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinMango), {
      fetcher,
    })

    const result = await runner.runSearch({ q: 'frieren' })

    expect(calls).toHaveLength(1)
    expect(result).toEqual([
      {
        providerIds: { collectionId: '444555' },
        indexedId: '444555',
        title: "Frieren: Beyond Journey's End",
        type: '动漫',
        year: 2023,
        imageUrl: 'https://example.com/frieren.jpg',
        episodeCount: 28,
      },
    ])
  })

  it('returns no danmaku rows when getctlbarrage yields an empty cdn_list', async () => {
    // Some Mango videos (older / unlicensed) have no danmaku CDN configured.
    // The pipeline must short-circuit cleanly instead of fetching `https:////`.
    const { fetcher } = mockFetcher({
      'https://pcweb.api.mgtv.com/video/info': {
        body: JSON.stringify({ data: { info: { time: '00:00:59' } } }),
      },
      'https://galaxy.bz.mgtv.com/getctlbarrage': {
        body: JSON.stringify({ data: { cdn_list: '', cdn_version: '' } }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinMango), {
      fetcher,
    })
    const result = await runner.runDanmaku({ cid: 'x', vid: 'y' })
    expect(result).toEqual([])
  })

  it('emits canonical danmaku rows in {p, m} shape', async () => {
    const cid = '444555'
    const vid = '666'
    const cdn = 'cdn.bz.mgtv.com'
    const version = 'v1'
    const { fetcher } = mockFetcher({
      'https://pcweb.api.mgtv.com/video/info': {
        body: JSON.stringify({ data: { info: { time: '00:00:59' } } }),
      },
      'https://galaxy.bz.mgtv.com/getctlbarrage': {
        body: JSON.stringify({
          data: { cdn_list: `${cdn},other.example`, cdn_version: version },
        }),
      },
      [`https://${cdn}/${version}/0.json`]: {
        body: JSON.stringify({
          data: {
            items: [
              { type: 5000, uid: 'user-1', content: 'first comment' },
              { type: 12345, uid: 'user-2', content: 'second comment' },
            ],
          },
        }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinMango), {
      fetcher,
    })

    const result = await runner.runDanmaku({ cid, vid })

    expect(result).toEqual([
      { p: '5,1,16777215,user-1', m: 'first comment' },
      { p: '12.345,1,16777215,user-2', m: 'second comment' },
    ])
  })
})
