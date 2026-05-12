import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import bilibiliManifest from './manifests/bilibili.json' with { type: 'json' }

// Matches what the extension actually does today (api.ts:52-90):
// parallel calls to /x/web-interface/search/type with search_type=media_bangumi
// and media_ft, no signing, relies on user cookies via credentials:include.

function media(seasonId: number, mediaId: number, title: string, type: string) {
  return {
    type,
    media_id: mediaId,
    season_id: seasonId,
    title,
    media_type: 'media_bangumi',
    cover: 'https://example.com/c.jpg',
    season_type_name: '番剧',
    season_type: 1,
    ep_size: 12,
    desc: '',
    pubtime: 0,
  }
}

const bangumiResponse = {
  code: 0,
  message: '',
  data: { result: [media(11, 22, '<em>Frieren</em>', 'media_bangumi')] },
}

const ftResponse = {
  code: 0,
  message: '',
  data: { result: [media(33, 44, 'Demon Slayer Movie', 'media_ft')] },
}

describe('Bilibili (simple, no WBI)', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(bilibiliManifest)).not.toThrow()
  })

  it('runs parallel media_bangumi + media_ft searches with cookies', async () => {
    const manifest = zManifest.parse(bilibiliManifest)
    const { fetcher, calls } = mockFetcher({
      'https://api.bilibili.com/x/web-interface/search/type': (url) => {
        const params = new URL(url).searchParams
        const body =
          params.get('search_type') === 'media_bangumi'
            ? bangumiResponse
            : ftResponse
        return { body: JSON.stringify(body) }
      },
    })
    const result = await runPipeline(
      manifest,
      manifest.search!,
      { q: 'frieren' },
      { fetcher }
    )

    expect(calls).toHaveLength(2)
    for (const c of calls) {
      const init = c.init as {
        credentials?: string
        headers?: Record<string, string>
        rewriteHeaders?: Record<string, string>
      }
      expect(init.credentials).toBe('include')
      expect(init.headers).toEqual({})
      expect(init.rewriteHeaders).toEqual({
        Referer: 'https://www.bilibili.com/',
      })
    }

    expect(result).toEqual([
      {
        providerIds: { seasonId: '11', mediaId: '22' },
        title: 'Frieren',
        type: '番剧',
        episodeCount: 12,
      },
      {
        providerIds: { seasonId: '33', mediaId: '44' },
        title: 'Demon Slayer Movie',
        type: '番剧',
        episodeCount: 12,
      },
    ])
  })
})
