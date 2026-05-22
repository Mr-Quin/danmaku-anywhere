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

  it('xml variant emits {p, m} CommentEntity rows with mode 2/3 collapsed to 1', async () => {
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

    // p is `${seconds},${mode},${color},${midHash}`; mode 2/3 collapse to 1
    // because the danmaku engine only renders modes 1, 4, 5.
    expect(result).toEqual([
      { p: '12.34,1,16777215,abcd1234', m: '第一条' },
      { p: '23.45,4,16711680,efgh5678', m: '底部弹幕' },
      { p: '34.56,5,255,ijkl9012', m: '顶部蓝色' },
      { p: '45.67,1,16777215,mnop3456', m: '反向弹幕' },
    ])
    expect(calls).toHaveLength(1)
  })

  it('protobuf variant paginates and stops after 3 consecutive empties', async () => {
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
    })) as Array<{ p: string; m: string }>

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ p: '12.34,1,16777215,h1', m: 'proto 1' })
    expect(result[2]).toEqual({ p: '365,5,255,h3', m: 'proto 顶部' })
    // segs 1,2 have content; 3,4,5 empty (3 in a row) → stop.
    expect(calls.length).toBe(5)
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
    expect(calls.length).toBe(3)
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
    })) as Array<{ p: string; m: string }>

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ p: '1,1,16777215,a', m: 'only one' })
  })

  it('protobuf variant survives a single transient empty mid-stream', async () => {
    const segWith = (progress: number, content: string) =>
      encodeSegment([
        { progress, mode: 1, color: 16777215, content, midHash: 'x' },
      ])
    const emptySeg = encodeSegment([])
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/v2/dm/web/seg.so': (url) => {
        const segIdx = Number(new URL(url).searchParams.get('segment_index'))
        if (segIdx === 1) return { body: segWith(1000, 'a') }
        if (segIdx === 2) return { body: segWith(2000, 'b') }
        if (segIdx === 3) return { body: emptySeg }
        if (segIdx === 4) return { body: segWith(4000, 'c') }
        return { body: emptySeg }
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })
    const result = (await runner.runDanmaku({
      cid: 1300001,
      danmakuFormat: 'protobuf',
    })) as Array<{ p: string; m: string }>

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.m)).toEqual(['a', 'b', 'c'])
    expect(calls.length).toBe(7)
  })

  it('protobuf variant collapses mode 2 and 3 into mode 1 in p', async () => {
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
    })) as Array<{ p: string; m: string }>

    expect(result).toEqual([
      { p: '10,1,16777215,a', m: 'mode 2' },
      { p: '20,1,16777215,b', m: 'mode 3' },
    ])
  })

  it('parseUrl resolves /bangumi/play/ss<id> via season_id query', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/pgc/view/web/season': {
        body: JSON.stringify(seasonFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runParseUrl(
      'https://www.bilibili.com/bangumi/play/ss41410'
    )) as {
      seasonInsert: { providerIds: { seasonId: number } }
      episodeMeta: {
        providerIds: { cid: number; epid: number }
        episodeNumber: number | string
      }
    } | null

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain('season_id=41410')
    expect(calls[0].url).not.toContain('ep_id=')
    // seasonId comes from the fixture response, not the URL.
    expect(result?.seasonInsert.providerIds.seasonId).toBe(41410)
    // First episode is picked when only ssid is in the URL.
    expect(result?.episodeMeta.providerIds.cid).toBe(1300001)
    expect(result?.episodeMeta.providerIds.epid).toBe(700001)
    expect(result?.episodeMeta.episodeNumber).toBe(1)
  })

  it('parseUrl resolves /bangumi/play/ep<id> via ep_id query and picks the matching episode', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/pgc/view/web/season': {
        body: JSON.stringify(seasonFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runParseUrl(
      'https://www.bilibili.com/bangumi/play/ep700002'
    )) as {
      episodeMeta: {
        providerIds: { cid: number; epid: number }
        episodeNumber: number | string
      }
    } | null

    expect(calls[0].url).toContain('ep_id=700002')
    expect(calls[0].url).not.toContain('season_id=')
    expect(result?.episodeMeta.providerIds.epid).toBe(700002)
    expect(result?.episodeMeta.providerIds.cid).toBe(1300002)
    expect(result?.episodeMeta.episodeNumber).toBe(2)
  })

  it('parseUrl returns null when the URL host does not match', async () => {
    const { fetcher } = mockFetcher({})
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })
    expect(await runner.runParseUrl('https://example.com/whatever')).toBeNull()
  })

  it('loginProbe returns nav.data with isLogin flag', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/web-interface/nav': {
        body: JSON.stringify({
          code: 0,
          message: '0',
          ttl: 1,
          data: { isLogin: true, uname: 'alice', mid: 12345 },
        }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    expect(runner.hasLoginProbe()).toBe(true)
    const result = (await runner.runLoginProbe()) as {
      isLogin: boolean
      uname?: string
    } | null

    expect(result?.isLogin).toBe(true)
    expect(calls).toHaveLength(1)
    expect((calls[0].init as { credentials?: string }).credentials).toBe(
      'include'
    )
  })

  it('loginProbe surfaces logged-out state via nav.data.isLogin = false', async () => {
    const { fetcher } = mockFetcher({
      'https://api.bilibili.com/x/web-interface/nav': {
        body: JSON.stringify({
          code: -101,
          message: '账号未登录',
          ttl: 1,
          data: { isLogin: false },
        }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runLoginProbe()) as { isLogin: boolean } | null
    expect(result?.isLogin).toBe(false)
  })

  it('parseUrl emits episodeMeta=undefined when no episode matches the epid', async () => {
    const { fetcher } = mockFetcher({
      'https://api.bilibili.com/pgc/view/web/season': {
        body: JSON.stringify(seasonFixture),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher,
    })

    const result = (await runner.runParseUrl(
      'https://www.bilibili.com/bangumi/play/ep999999'
    )) as {
      seasonInsert: { indexedId: string }
      episodeMeta: unknown
    } | null

    expect(result?.seasonInsert.indexedId).toBe('41410')
    expect(result?.episodeMeta).toBeUndefined()
  })
})
