import { describe, expect, it } from 'vitest'
import { ManifestRunner } from '../engine/ManifestRunner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import ddpManifest from './manifests/ddp.json' with { type: 'json' }

const ddpResponse = {
  hasMore: false,
  animes: [
    {
      animeId: 12345,
      bangumiId: 'b12345',
      animeTitle: 'Cyberpunk: Edgerunners',
      type: 'TVSeries',
      episodes: [
        { episodeId: 1, episodeTitle: 'EP1' },
        { episodeId: 2, episodeTitle: 'EP2' },
      ],
    },
    {
      animeId: 67890,
      bangumiId: 'b67890',
      animeTitle: 'Frieren',
      type: 'TVSeries',
      episodes: [{ episodeId: 1, episodeTitle: 'EP1' }],
    },
  ],
  success: true,
}

describe('DDP manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(ddpManifest)).not.toThrow()
  })

  it('runs search and maps to canonical shape', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.dandanplay.net/api/v2/search/anime': {
        body: JSON.stringify(ddpResponse),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(ddpManifest), { fetcher })

    const result = await runner.runSearch({ q: 'cyberpunk' })

    expect(result).toEqual([
      {
        providerIds: { animeId: '12345', bangumiId: 'b12345' },
        title: 'Cyberpunk: Edgerunners',
        type: 'TVSeries',
        episodeCount: 2,
      },
      {
        providerIds: { animeId: '67890', bangumiId: 'b67890' },
        title: 'Frieren',
        type: 'TVSeries',
        episodeCount: 1,
      },
    ])

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://api.dandanplay.net/api/v2/search/anime?keyword=cyberpunk'
    )
    expect(
      (calls[0].init as { headers?: Record<string, string> }).headers
    ).toEqual({
      Accept: 'application/json',
    })
  })

  it('blocks requests to hosts not in the allowlist', async () => {
    const { fetcher } = mockFetcher({})
    const runner = new ManifestRunner(
      zManifest.parse({
        ...ddpManifest,
        hosts: ['something.else.com'],
      }),
      { fetcher }
    )
    await expect(runner.runSearch({ q: 'x' })).rejects.toThrow(
      /not in manifest.hosts allowlist/
    )
  })
})
