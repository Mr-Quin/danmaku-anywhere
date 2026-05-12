import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import builtinTencent from '../manifests/builtin-tencent.json' with {
  type: 'json',
}

interface MockResponse {
  status?: number
  body: string
  headers?: Record<string, string>
}

function mockFetcher(
  handlers: Record<
    string,
    MockResponse | ((url: string, init: unknown) => MockResponse)
  >
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
    const resp = typeof handler === 'function' ? handler(input, init) : handler
    const headers = new Map<string, string>(Object.entries(resp.headers ?? {}))
    return {
      status: resp.status ?? 200,
      text: async () => {
        return resp.body
      },
      bytes: async () => {
        return new TextEncoder().encode(resp.body)
      },
      headers,
    }
  }
  return { fetcher, calls }
}

const searchFixture = {
  ret: 0,
  msg: '',
  data: {
    areaBoxList: [
      {
        boxId: 'MainNeed',
        itemList: [
          {
            doc: { dataType: 1, id: 'mzc00200qkxg2td' },
            videoInfo: {
              videoType: 2,
              typeName: '动漫',
              title: '葬送的芙莉莲',
              year: 2023,
              imgUrl: 'https://puui.qpic.cn/vcover/frieren.jpg',
              episodeSites: [{ showName: '正片', totalEpisode: 28 }],
            },
          },
          {
            // junk entry without episodeSites — should be filtered out
            doc: { dataType: 1, id: 'junk' },
            videoInfo: {
              videoType: 2,
              typeName: '其它',
              title: '不该出现',
              year: 2020,
              imgUrl: 'https://example.com/x.jpg',
              episodeSites: [],
            },
          },
        ],
      },
    ],
    normalList: { itemList: [] },
  },
}

function makeEpisodePage(start: number, count: number) {
  const items = []
  for (let i = 0; i < count; i++) {
    const n = start + i
    items.push({
      item_id: `id_${n}`,
      item_params: {
        vid: `vid_${n}`,
        cid: 'mzc00200qkxg2td',
        is_trailer: '0',
        play_title: `${n}`,
        title: `第${n}集`,
        union_title: `第${n}集 - 标题${n}`,
        image_url: `https://example.com/${n}.jpg`,
      },
    })
  }
  return {
    ret: 0,
    msg: '',
    data: {
      has_next_page: count === 100,
      module_list_datas: [
        {
          module_datas: [
            { module_id: 'main', item_data_lists: { item_datas: items } },
          ],
        },
      ],
    },
  }
}

const danmakuBase = {
  segment_start: 0,
  segment_span: 30000,
  segment_index: {
    '0': { segment_start: 0, segment_name: '0' },
    '1': { segment_start: 30000, segment_name: '30000' },
  },
}

const danmakuSegment0 = {
  barrage_list: [
    {
      id: '101',
      content: 'hello tencent',
      time_offset: 5000,
      content_score: 0,
      content_style:
        '{"color":"FFFFFF","gradient_colors":["FFFFFF",""],"position":0}',
    },
    {
      id: '102',
      content: 'colored',
      time_offset: 12345,
      content_score: 0,
      content_style:
        '{"color":"FF0000","gradient_colors":["FF0000",""],"position":0}',
    },
  ],
}

const danmakuSegment1 = {
  barrage_list: [
    {
      id: '201',
      content: 'no style',
      time_offset: 35000,
      content_score: 0,
      content_style: '',
    },
  ],
}

describe('builtin:tencent manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinTencent)).not.toThrow()
  })

  it('runs search, picks MainNeed box, filters episodeless items', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vplatform=2':
        {
          body: JSON.stringify(searchFixture),
        },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinTencent), {
      fetcher,
    })

    const result = await runner.runSearch({ q: 'frieren' })

    expect(result).toEqual([
      {
        providerIds: { cid: 'mzc00200qkxg2td' },
        indexedId: 'mzc00200qkxg2td',
        title: '葬送的芙莉莲',
        type: '动漫',
        typeDescription: '动漫',
        imageUrl: 'https://puui.qpic.cn/vcover/frieren.jpg',
        episodeCount: 28,
        year: 2023,
      },
    ])

    expect(calls).toHaveLength(1)
    const init = calls[0].init as {
      method?: string
      headers?: Record<string, string>
      body?: string
      rewriteHeaders?: Record<string, string>
    }
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.rewriteHeaders).toEqual({
      Origin: 'https://v.qq.com',
      Referer: 'https://v.qq.com/',
    })
    const body = JSON.parse(init.body ?? '{}')
    expect(body.query).toBe('frieren')
    expect(body.pagesize).toBe(30)
  })

  it('falls back to normalList when MainNeed box is absent', async () => {
    const noMainNeed = {
      ret: 0,
      msg: '',
      data: {
        areaBoxList: [
          {
            boxId: 'Other',
            itemList: [],
          },
        ],
        normalList: {
          itemList: [
            {
              doc: { dataType: 1, id: 'fallback-1' },
              videoInfo: {
                videoType: 2,
                typeName: '电影',
                title: 'Fallback Movie',
                year: 2024,
                imgUrl: 'https://example.com/fb.jpg',
                episodeSites: [{ showName: '正片', totalEpisode: 1 }],
              },
            },
          ],
        },
      },
    }
    const { fetcher } = mockFetcher({
      'https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vplatform=2':
        {
          body: JSON.stringify(noMainNeed),
        },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinTencent), {
      fetcher,
    })

    const result = (await runner.runSearch({ q: 'x' })) as Array<{
      providerIds: { cid: string }
    }>
    expect(result).toHaveLength(1)
    expect(result[0].providerIds.cid).toBe('fallback-1')
  })

  it('paginates episodes and stops on partial page via breakOn', async () => {
    let pageCalls = 0
    const { fetcher, calls } = mockFetcher({
      'https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vversion_name=8.2.96&vversion_platform=2':
        () => {
          // Two full pages (100), then a partial page (45). breakOn fires on
          // the partial page and the loop stops without fetching a 4th page.
          const pageIdx = pageCalls++
          if (pageIdx === 0)
            return { body: JSON.stringify(makeEpisodePage(1, 100)) }
          if (pageIdx === 1)
            return { body: JSON.stringify(makeEpisodePage(101, 100)) }
          if (pageIdx === 2)
            return { body: JSON.stringify(makeEpisodePage(201, 45)) }
          throw new Error('unexpected extra page call')
        },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinTencent), {
      fetcher,
    })

    const result = (await runner.runEpisodes({
      cid: 'mzc00200qkxg2td',
    })) as Array<{ providerIds: { vid: string }; episodeNumber: string }>

    expect(calls).toHaveLength(3)
    expect(result).toHaveLength(245)
    expect(result[0].providerIds.vid).toBe('vid_1')
    expect(result[244].providerIds.vid).toBe('vid_245')
    expect(result[0].episodeNumber).toBe('1')
  })

  it('handles a series whose total fits in one (full) page', async () => {
    // Edge case: a series returning exactly 100 episodes on page 0 should
    // fetch page 1 (to discover it's empty), then stop. The looped-back
    // detection happens via the empty-page → breakOn fires path.
    let pageCalls = 0
    const { fetcher, calls } = mockFetcher({
      'https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vversion_name=8.2.96&vversion_platform=2':
        () => {
          const pageIdx = pageCalls++
          if (pageIdx === 0) {
            return { body: JSON.stringify(makeEpisodePage(1, 100)) }
          }
          // Page 1 has 0 episodes — Tencent returns either empty or looped
          // content past the end. Empty → breakOn ($count = 0) fires → stop.
          return { body: JSON.stringify(makeEpisodePage(101, 0)) }
        },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinTencent), {
      fetcher,
    })

    const result = (await runner.runEpisodes({
      cid: 'mzc00200qkxg2td',
    })) as Array<{ providerIds: { vid: string } }>

    expect(calls).toHaveLength(2)
    expect(result).toHaveLength(100)
  })

  it('runs the two-phase danmaku flow and parses styled comments', async () => {
    const vid = 'vid_42'
    const { fetcher, calls } = mockFetcher({
      [`https://dm.video.qq.com/barrage/base/${vid}`]: {
        body: JSON.stringify(danmakuBase),
      },
      [`https://dm.video.qq.com/barrage/segment/${vid}/0`]: {
        body: JSON.stringify(danmakuSegment0),
      },
      [`https://dm.video.qq.com/barrage/segment/${vid}/30000`]: {
        body: JSON.stringify(danmakuSegment1),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinTencent), {
      fetcher,
    })

    const result = await runner.runDanmaku({ vid })

    expect(result).toEqual([
      { cid: 101, p: '5,1,16777215', m: 'hello tencent' },
      { cid: 102, p: '12.345,1,16711680', m: 'colored' },
      { cid: 201, p: '35,1,16777215', m: 'no style' },
    ])
    expect(calls).toHaveLength(3)
  })
})
