import { md5 } from 'js-md5'
import { describe, expect, it, vi } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import bilibiliManifest from './manifests/bilibili-wbi.json' with {
  type: 'json',
}

const BILIBILI_WBI_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
]

// Recompute mixinKey + w_rid imperatively to verify the manifest produces
// byte-identical signing output to a hand-written implementation.
function computeMixinKey(imgKey: string, subKey: string): string {
  const combined = imgKey + subKey
  let mixed = ''
  for (const i of BILIBILI_WBI_TABLE) {
    if (i < combined.length) mixed += combined[i]
  }
  return mixed.substring(0, 32)
}

function computeWRid(params: Record<string, string>, mixinKey: string): string {
  const sorted = Object.keys(params).sort()
  const queryString = sorted
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  return md5(queryString + mixinKey)
}

const imgKey = '7cd084941338484aae1ad9425b84077c'
const subKey = '4932caff0ff746eab6f01bf08b70ac45'

const navResponse = {
  code: 0,
  data: {
    wbi_img: {
      img_url: `https://i0.hdslb.com/bfs/wbi/${imgKey}.png`,
      sub_url: `https://i0.hdslb.com/bfs/wbi/${subKey}.png`,
    },
  },
}

const searchResponse = {
  code: 0,
  data: {
    result: [
      {
        season_id: 12345,
        media_id: 67890,
        title: '<em class="keyword">Frieren</em>: Beyond Journey\'s End',
        season_type_name: '番剧',
        ep_size: 28,
      },
    ],
  },
}

describe('Bilibili WBI manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(bilibiliManifest)).not.toThrow()
  })

  it('does the WBI dance: nav → mixin → sign → search', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-11T12:00:00Z'))
    const wts = String(Math.floor(Date.now() / 1000))

    const manifest = zManifest.parse(bilibiliManifest)
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/web-interface/nav': {
        body: JSON.stringify(navResponse),
      },
      'https://api.bilibili.com/x/web-interface/wbi/search/type': {
        body: JSON.stringify(searchResponse),
      },
    })

    const result = await runPipeline(
      manifest,
      manifest.search!,
      { q: 'frieren' },
      { fetcher }
    )

    expect(calls).toHaveLength(2)
    expect(calls[0].url).toBe('https://api.bilibili.com/x/web-interface/nav')

    const searchCall = calls[1]
    expect(searchCall.url).toMatch(
      /^https:\/\/api\.bilibili\.com\/x\/web-interface\/wbi\/search\/type\?/
    )

    const url = new URL(searchCall.url)
    expect(url.searchParams.get('keyword')).toBe('frieren')
    expect(url.searchParams.get('search_type')).toBe('media_bangumi')
    expect(url.searchParams.get('wts')).toBe(wts)

    // The critical assertion: the w_rid must match what an imperative
    // implementation of WBI signing would have produced for the same inputs.
    const expectedMixin = computeMixinKey(imgKey, subKey)
    const expectedWRid = computeWRid(
      { keyword: 'frieren', search_type: 'media_bangumi', wts },
      expectedMixin
    )
    expect(url.searchParams.get('w_rid')).toBe(expectedWRid)

    expect(result).toEqual([
      {
        providerIds: { seasonId: '12345', mediaId: '67890' },
        title: "Frieren: Beyond Journey's End",
        type: '番剧',
        episodeCount: 28,
      },
    ])

    vi.useRealTimers()
  })
})
