import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import youkuManifest from './manifests/youku.json' with { type: 'json' }

// Search-only. Youku's danmaku fetch needs (a) extracting _m_h5_tk from a
// prior response's Set-Cookie, (b) attaching it as a Cookie header on
// subsequent requests, and (c) iterating per-minute segments. All three are
// engine gaps documented in the summary.

const youkuSearchResponse = {
  pageComponentList: [
    {
      commonData: {
        isYouku: 1,
        showId: 'ya0123abc',
        titleDTO: { displayName: '<em>Frieren</em>【独家】' },
        cats: '动漫',
        feature: '日本/动漫/2023/24集',
        posterDTO: { vThumbUrl: 'https://example.com/p.jpg' },
        episodeTotal: 28,
      },
    },
    {
      commonData: {
        isYouku: 0,
        hasYouku: 0,
        showId: 'other',
        titleDTO: { displayName: 'should filter out' },
      },
    },
  ],
}

describe('Youku (search)', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(youkuManifest)).not.toThrow()
  })

  it('filters non-Youku content and maps showId/title', async () => {
    const manifest = zManifest.parse(youkuManifest)
    const { fetcher, calls } = mockFetcher({
      'https://search.youku.com/api/search': {
        body: JSON.stringify(youkuSearchResponse),
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
        providerIds: { showId: 'ya0123abc' },
        title: 'Frieren',
        type: '动漫',
        year: 2023,
        imageUrl: 'https://example.com/p.jpg',
        episodeCount: 28,
      },
    ])
  })
})
