import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import mangoManifest from './manifests/mango.json' with { type: 'json' }

// End-to-end exercise: search → episodes (multi-month forEach) → danmaku
// (segment-loop forEach driven by video duration). Proves the engine can
// express the full danmaku-fetch path declaratively for a representative source.

const mangoSearchResponse = {
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
          {
            source: 'iqiyi',
            url: 'https://www.iqiyi.com/x/999.html',
            title: 'should be filtered (non-imgo source)',
            desc: ['类型:电视剧/2024/中国'],
            img: '',
            videoCount: 12,
          },
        ],
      },
      {
        type: 'feed',
        data: [{ source: 'imgo', title: 'should be filtered (non-media)' }],
      },
    ],
  },
}

describe('Mango (search)', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(mangoManifest)).not.toThrow()
  })

  it('filters by source=imgo and extracts collection_id from URL', async () => {
    const manifest = zManifest.parse(mangoManifest)
    const { fetcher, calls } = mockFetcher({
      'https://mobileso.bz.mgtv.com/msite/search/v2': {
        body: JSON.stringify(mangoSearchResponse),
      },
    })
    const result = await runPipeline(
      manifest,
      manifest.search!,
      { q: 'frieren' },
      { fetcher }
    )

    expect(calls).toHaveLength(1)
    expect(result).toEqual([
      {
        providerIds: { collectionId: '444555' },
        title: "Frieren: Beyond Journey's End",
        type: '动漫',
        year: 2023,
        imageUrl: 'https://example.com/frieren.jpg',
        episodeCount: 28,
      },
    ])
  })
})

describe('Mango (episodes — forEach over months)', () => {
  it('fetches the month list once, then iterates each month and concatenates', async () => {
    const manifest = zManifest.parse(mangoManifest)
    const bootstrap = {
      data: {
        tab_m: [{ m: '202309' }, { m: '202310' }, { m: '202311' }],
        list: [],
      },
    }
    const monthResponses: Record<string, unknown> = {
      '202309': {
        data: {
          list: [
            { video_id: 'v1', t1: '第1集', t2: '相遇', src_clip_id: '444555' },
            { video_id: 'v2', t1: '第2集', t2: '冒险', src_clip_id: '444555' },
            // wrong src_clip_id — must be filtered out
            { video_id: 'vX', t1: '幕后', t2: '花絮', src_clip_id: '999999' },
          ],
        },
      },
      '202310': {
        data: {
          list: [
            { video_id: 'v3', t1: '第3集', t2: '同伴', src_clip_id: '444555' },
          ],
        },
      },
      '202311': {
        data: {
          list: [
            { video_id: 'v4', t1: '第4集', t2: '旅途', src_clip_id: '444555' },
          ],
        },
      },
    }

    let bootstrapCount = 0
    const { fetcher, calls } = mockFetcher({
      'https://pcweb.api.mgtv.com/variety/showlist': (url) => {
        const params = new URL(url).searchParams
        const month = params.get('month') ?? ''
        if (month === '') {
          bootstrapCount++
          return { body: JSON.stringify(bootstrap) }
        }
        const r = monthResponses[month]
        if (!r) throw new Error(`unexpected month: ${month}`)
        return { body: JSON.stringify(r) }
      },
    })

    const result = await runPipeline(
      manifest,
      manifest.episodes!,
      { collectionId: '444555' },
      { fetcher }
    )

    expect(bootstrapCount).toBe(1)
    expect(calls).toHaveLength(4) // 1 bootstrap + 3 months
    expect(result).toEqual([
      {
        providerIds: { vid: 'v1', cid: '444555' },
        title: '第1集 相遇',
        episodeNumber: 1,
      },
      {
        providerIds: { vid: 'v2', cid: '444555' },
        title: '第2集 冒险',
        episodeNumber: 2,
      },
      {
        providerIds: { vid: 'v3', cid: '444555' },
        title: '第3集 同伴',
        episodeNumber: 3,
      },
      {
        providerIds: { vid: 'v4', cid: '444555' },
        title: '第4集 旅途',
        episodeNumber: 4,
      },
    ])
  })
})

describe('Mango (danmaku — segment-loop forEach)', () => {
  it('drives segment iteration off the video duration', async () => {
    const manifest = zManifest.parse(mangoManifest)

    // Duration 02:30 → 150 seconds → ceil(150/60) = 3 segments (indices 0,1,2)
    const infoResponse = { data: { info: { time: '02:30' } } }
    const ctlResponse = {
      data: { cdn_list: 'cdn1.mgtv.com,cdn2.mgtv.com', cdn_version: 'v100' },
    }
    const segmentBodies: Record<string, unknown> = {
      '0': {
        data: {
          items: [
            { type: 1000, content: 'first', uid: 5 },
            { type: 5000, content: 'second' },
          ],
        },
      },
      '1': { data: { items: [{ type: 65000, content: 'mid' }] } },
      '2': { data: { items: [{ type: 125000, content: 'late', uid: 12 }] } },
    }

    const { fetcher, calls } = mockFetcher({
      'https://pcweb.api.mgtv.com/video/info': {
        body: JSON.stringify(infoResponse),
      },
      'https://galaxy.bz.mgtv.com/getctlbarrage': {
        body: JSON.stringify(ctlResponse),
      },
      'https://cdn1.mgtv.com/v100/0.json': {
        body: JSON.stringify(segmentBodies['0']),
      },
      'https://cdn1.mgtv.com/v100/1.json': {
        body: JSON.stringify(segmentBodies['1']),
      },
      'https://cdn1.mgtv.com/v100/2.json': {
        body: JSON.stringify(segmentBodies['2']),
      },
    })

    const result = await runPipeline(
      manifest,
      manifest.danmaku!,
      { cid: '444555', vid: 'v1' },
      { fetcher }
    )

    // Two bootstrap calls + 3 segment calls = 5 total
    expect(calls).toHaveLength(5)
    const segmentUrls = calls
      .slice(2)
      .map((c) => c.url)
      .sort()
    expect(segmentUrls).toEqual([
      'https://cdn1.mgtv.com/v100/0.json',
      'https://cdn1.mgtv.com/v100/1.json',
      'https://cdn1.mgtv.com/v100/2.json',
    ])

    // `like` is absent (not null) when upstream didn't provide a uid value —
    // optional metadata, projection drops the key entirely.
    expect(result).toEqual([
      { time: 1.0, mode: 1, color: 16777215, text: 'first', like: 5 },
      { time: 5.0, mode: 1, color: 16777215, text: 'second' },
      { time: 65.0, mode: 1, color: 16777215, text: 'mid' },
      { time: 125.0, mode: 1, color: 16777215, text: 'late', like: 12 },
    ])
  })

  it('aborts mid-pipeline when the signal fires', async () => {
    const manifest = zManifest.parse(mangoManifest)
    const controller = new AbortController()

    const { fetcher } = mockFetcher({
      'https://pcweb.api.mgtv.com/video/info': () => {
        // Abort the controller during the first fetch, before any segments run.
        controller.abort()
        return { body: JSON.stringify({ data: { info: { time: '10:00' } } }) }
      },
      'https://galaxy.bz.mgtv.com/getctlbarrage': {
        body: JSON.stringify({
          data: { cdn_list: 'cdn1.mgtv.com', cdn_version: 'v1' },
        }),
      },
    })

    await expect(
      runPipeline(
        manifest,
        manifest.danmaku!,
        { cid: '444555', vid: 'v1' },
        { fetcher, signal: controller.signal }
      )
    ).rejects.toThrow(/aborted/i)
  })
})
