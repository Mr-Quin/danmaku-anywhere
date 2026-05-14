import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import protobuf from 'protobufjs'
import { describe, expect, it } from 'vitest'
import builtinBilibili from '../manifests/builtin-bilibili.json' with {
  type: 'json',
}
import bangumiFixture from './fixtures/bilibili-search-bangumi.json' with {
  type: 'json',
}
import ftFixture from './fixtures/bilibili-search-ft.json' with { type: 'json' }
import seasonFixture from './fixtures/bilibili-season.json' with {
  type: 'json',
}

const XML_FIXTURE = readFileSync(
  fileURLToPath(new URL('./fixtures/bilibili-xml.xml', import.meta.url)),
  'utf-8'
)

interface MockResponse {
  status?: number
  body: string | Uint8Array
  headers?: Record<string, string>
}

function mockFetcher(
  handlers: Record<string, MockResponse | ((url: string) => MockResponse)>
): {
  fetcher: FetchLike
  calls: Array<{ url: string; init?: unknown }>
} {
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
    const headers = new Map<string, string>(Object.entries(resp.headers ?? {}))
    const isBytes = resp.body instanceof Uint8Array
    return {
      status: resp.status ?? 200,
      text: async () => {
        return isBytes
          ? new TextDecoder().decode(resp.body as Uint8Array)
          : (resp.body as string)
      },
      bytes: async () => {
        return isBytes
          ? (resp.body as Uint8Array)
          : new TextEncoder().encode(resp.body as string)
      },
      headers,
    }
  }
  return { fetcher, calls }
}

const PROTO_TEXT = (builtinBilibili as { protoSchemas: Record<string, string> })
  .protoSchemas.bili

function encodeSegment(
  items: Array<{
    progress: number
    mode: number
    color: number
    content: string
    midHash?: string
  }>
): Uint8Array {
  const root = protobuf.parse(PROTO_TEXT, { keepCase: true }).root
  const Reply = root.lookupType('dm.v1.DmSegMobileReply')
  const message = Reply.create({ elems: items })
  return Reply.encode(message).finish()
}

describe('builtin:bilibili manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinBilibili)).not.toThrow()
  })

  it('runs parallel media_bangumi + media_ft searches', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/web-interface/search/type': (url) => {
        const params = new URL(url).searchParams
        const body =
          params.get('search_type') === 'media_bangumi'
            ? bangumiFixture
            : ftFixture
        return { body: JSON.stringify(body) }
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = await runner.runSearch({ q: 'frieren' })

    expect(calls).toHaveLength(2)
    for (const c of calls) {
      const init = c.init as {
        credentials?: string
        rewriteHeaders?: Record<string, string>
      }
      expect(init.credentials).toBe('include')
      expect(init.rewriteHeaders).toEqual({
        Referer: 'https://www.bilibili.com/',
      })
    }

    expect(result).toEqual([
      {
        providerIds: { seasonId: 41410, mediaId: 28219412 },
        indexedId: '41410',
        title: '葬送的芙莉莲',
        type: '番剧',
        typeDescription: '番剧',
        imageUrl: 'https://i0.hdslb.com/bfs/bangumi/image/frieren.jpg',
        episodeCount: 28,
        year: 2023,
      },
      {
        providerIds: { seasonId: 91234, mediaId: 91234 },
        indexedId: '91234',
        title: 'Demon Slayer Movie',
        type: '电影',
        typeDescription: '电影',
        imageUrl: 'https://i0.hdslb.com/bfs/bangumi/image/movie.jpg',
        episodeCount: 1,
        year: 2021,
      },
    ])
  })

  it('runs the episodes pipeline and maps to canonical shape', async () => {
    const { fetcher } = mockFetcher({
      'https://api.bilibili.com/pgc/view/web/season?season_id=41410': {
        body: JSON.stringify(seasonFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = await runner.runEpisodes({ seasonId: 41410 })

    expect(result).toEqual([
      {
        providerIds: {
          cid: 1300001,
          aid: 100001,
          bvid: 'BV1aaaaaaaa',
          epid: 700001,
        },
        indexedId: '1300001',
        title: '旅途的终点',
        episodeNumber: 1,
        imageUrl: 'https://i0.hdslb.com/bfs/bangumi/ep1.jpg',
        alternativeTitle: ['葬送的芙莉莲 第1话'],
      },
      {
        providerIds: {
          cid: 1300002,
          aid: 100002,
          bvid: 'BV1bbbbbbbb',
          epid: 700002,
        },
        indexedId: '1300002',
        title: '不杀人的魔法',
        episodeNumber: 2,
        imageUrl: 'https://i0.hdslb.com/bfs/bangumi/ep2.jpg',
        alternativeTitle: ['葬送的芙莉莲 第2话'],
      },
    ])
  })

  it('xml variant parses bilibili XML danmaku', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/v1/dm/list.so?oid=1300001': {
        body: XML_FIXTURE,
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = await runner.runDanmaku({
      cid: 1300001,
      danmakuFormat: 'xml',
    })

    expect(result).toEqual([
      { p: '12.34,1,16777215,abcd1234', m: '第一条' },
      { p: '23.45,4,16711680,efgh5678', m: '底部弹幕' },
      { p: '34.56,5,255,ijkl9012', m: '顶部蓝色' },
    ])
    expect(calls).toHaveLength(1)
  })

  it('protobuf variant paginates until the first empty segment', async () => {
    const seg1 = encodeSegment([
      {
        progress: 12340,
        mode: 1,
        color: 16777215,
        content: 'proto 1',
        midHash: 'h1',
      },
      {
        progress: 23450,
        mode: 4,
        color: 16711680,
        content: 'proto 底部',
        midHash: 'h2',
      },
    ])
    const seg2 = encodeSegment([
      {
        progress: 365000,
        mode: 5,
        color: 255,
        content: 'proto 顶部',
        midHash: 'h3',
      },
    ])
    const emptySeg = encodeSegment([])

    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/v2/dm/web/seg.so': (url) => {
        const segIdx = new URL(url).searchParams.get('segment_index')
        if (segIdx === '1') return { body: seg1 }
        if (segIdx === '2') return { body: seg2 }
        return { body: emptySeg }
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runDanmaku({
      cid: 1300001,
      danmakuFormat: 'protobuf',
    })) as Array<{
      progress: number
      mode: number
      color: number
      midHash: string
      content: string
    }>

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      progress: 12340,
      mode: 1,
      color: 16777215,
      midHash: 'h1',
      content: 'proto 1',
    })
    expect(result[2]).toMatchObject({
      progress: 365000,
      mode: 5,
      color: 255,
      midHash: 'h3',
      content: 'proto 顶部',
    })
    // breakOn stops the loop on the first empty segment — segs 1, 2, then
    // 3 (empty) triggers stop. No more requests fire.
    expect(calls.length).toBe(3)
  })

  it('protobuf variant is the default when danmakuFormat omitted', async () => {
    const emptySeg = encodeSegment([])
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/v2/dm/web/seg.so': { body: emptySeg },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })
    // No danmakuFormat input — should pick the no-`when` (default) variant.
    const result = await runner.runDanmaku({ cid: 1300001 })
    expect(result).toEqual([])
    expect(calls.length).toBe(1) // breakOn fires immediately on empty seg 1
  })

  it('protobuf variant decodes 304-with-empty-body as no-more-segments', async () => {
    // Bilibili abuses 304 as "no danmaku for this segment". The manifest
    // opts in via acceptStatus: [304], and the engine decodes the empty
    // body as an empty proto message (zero elems contributed).
    const seg1 = encodeSegment([
      {
        progress: 1000,
        mode: 1,
        color: 16777215,
        content: 'only one',
        midHash: 'a',
      },
    ])
    const { fetcher } = mockFetcher({
      'https://api.bilibili.com/x/v2/dm/web/seg.so': (url) => {
        const segIdx = new URL(url).searchParams.get('segment_index')
        if (segIdx === '1') {
          return { body: seg1 }
        }
        return { status: 304, body: new Uint8Array(0) }
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runDanmaku({
      cid: 1300001,
      danmakuFormat: 'protobuf',
    })) as Array<{ progress: number; content: string }>

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ progress: 1000, content: 'only one' })
  })

  it('protobuf variant emits raw decoded elems (mode mapping done by host)', async () => {
    const seg1 = encodeSegment([
      {
        progress: 10000,
        mode: 2,
        color: 0xffffff,
        content: 'mode 2',
        midHash: 'a',
      },
      {
        progress: 20000,
        mode: 3,
        color: 0xffffff,
        content: 'mode 3',
        midHash: 'b',
      },
    ])
    const emptySeg = encodeSegment([])
    const { fetcher } = mockFetcher({
      'https://api.bilibili.com/x/v2/dm/web/seg.so': (url) => {
        const segIdx = new URL(url).searchParams.get('segment_index')
        return { body: segIdx === '1' ? seg1 : emptySeg }
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runDanmaku({
      cid: 1300001,
      danmakuFormat: 'protobuf',
    })) as Array<{ mode: number }>

    expect(result.map((c) => c.mode)).toEqual([2, 3])
  })
})
