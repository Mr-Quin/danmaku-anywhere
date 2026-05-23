import type { FetchLike } from '@danmaku-anywhere/dango'
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { describe, expect, it } from 'vitest'
import builtinYouku from '../manifests/builtin-youku.json' with { type: 'json' }

/**
 * Smoke-tests builtin:youku's search pipeline shape against the host
 * contract. The dango package owns broader Youku mechanics coverage
 * (signing chain, partitioned cookie replay, etc.).
 */

interface MockResponse {
  status?: number
  body: string
}

function mockFetcher(handlers: Record<string, MockResponse>): {
  fetcher: FetchLike
  calls: Array<{ url: string; init?: unknown }>
} {
  const calls: Array<{ url: string; init?: unknown }> = []
  const fetcher: FetchLike = async (input, init) => {
    calls.push({ url: input, init })
    let handler = handlers[input]
    if (handler === undefined) {
      handler = handlers[input.split('?')[0]]
    }
    if (handler === undefined) {
      throw new Error(`mockFetcher: no handler for ${input}`)
    }
    return {
      status: handler.status ?? 200,
      text: async () => handler.body,
      bytes: async () => new TextEncoder().encode(handler.body),
      headers: new Map(),
    }
  }
  return { fetcher, calls }
}

describe('builtin:youku manifest', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(builtinYouku)).not.toThrow()
  })

  it('filters non-Youku content and emits canonical rows with indexedId', async () => {
    const { fetcher } = mockFetcher({
      'https://search.youku.com/api/search': {
        body: JSON.stringify({
          pageComponentList: [
            {
              commonData: {
                isYouku: 1,
                showId: 'ya0123abc',
                titleDTO: { displayName: '<em>Frieren</em>' },
                feature: '2023 · 动漫 · 日本',
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
        }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(builtinYouku), {
      fetcher,
    })

    const result = await runner.runSearch({ q: 'frieren' })

    expect(result).toEqual([
      {
        providerIds: { showId: 'ya0123abc' },
        indexedId: 'ya0123abc',
        title: 'Frieren',
        type: '动漫',
        year: 2023,
        imageUrl: 'https://example.com/p.jpg',
        episodeCount: 28,
      },
    ])
  })
})
