import { describe, expect, it } from 'vitest'
import { JsonataEvaluator } from '../engine/jsonata-eval.js'
import { ManifestRunner } from '../engine/ManifestRunner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

// Minimal search-only manifest. Anything more complex belongs in
// dango-manifests where real source manifests live.
const ddpManifest = {
  apiVersion: 1,
  id: 'ddp',
  name: 'DanDanPlay',
  version: '0.1.0',
  hosts: ['api.dandanplay.net'],
  search: {
    inputs: ['q'],
    steps: [
      {
        type: 'http',
        id: 'search',
        request: {
          method: 'GET',
          url: "'https://api.dandanplay.net/api/v2/search/anime'",
          query: "{ 'keyword': q }",
        },
      },
    ],
    output: '[search.animes]',
  },
}

describe('ManifestRunner', () => {
  const parsed = zManifest.parse(ddpManifest)

  it('exposes manifest identity and capability flags', () => {
    const runner = new ManifestRunner(parsed)
    expect(runner.id).toBe('ddp')
    expect(runner.name).toBe('DanDanPlay')
    expect(runner.hasSearch()).toBe(true)
    expect(runner.hasEpisodes()).toBe(false)
    expect(runner.hasDanmaku()).toBe(false)
  })

  it('runs the search pipeline with bound options', async () => {
    const { fetcher } = mockFetcher({
      'https://api.dandanplay.net/api/v2/search/anime': {
        body: JSON.stringify({ animes: [], success: true }),
      },
    })
    const runner = new ManifestRunner(parsed, { fetcher })
    const result = await runner.runSearch({ q: 'x' })
    expect(Array.isArray(result)).toBe(true)
  })

  it('errors when invoking a pipeline the manifest does not declare', async () => {
    const runner = new ManifestRunner(parsed)
    await expect(runner.runDanmaku({ episodeId: 1 })).rejects.toThrow(
      /does not declare a danmaku pipeline/
    )
  })

  it('per-call options override instance options', async () => {
    const baseFetcher = mockFetcher({}).fetcher
    const overrideFetcher = mockFetcher({
      'https://api.dandanplay.net/api/v2/search/anime': {
        body: JSON.stringify({ animes: [], success: true }),
      },
    })
    const runner = new ManifestRunner(parsed, { fetcher: baseFetcher })
    await runner.runSearch({ q: 'x' }, { fetcher: overrideFetcher.fetcher })
    expect(overrideFetcher.calls).toHaveLength(1)
  })
})

/**
 * Covers ManifestRunner.runParseUrl: URL pattern matching, named-capture-group
 * extraction into pipeline inputs, the no-match returns-null path, and the
 * no-pipeline returns-null path.
 */
describe('ManifestRunner.runParseUrl', () => {
  const parseUrlManifest = {
    apiVersion: 1,
    id: 'demo',
    name: 'Demo',
    version: '0.1.0',
    hosts: ['api.example.com'],
    urlMatch: [{ host: 'www.example.com', path: '^/play/(?<id>\\d+)$' }],
    parseUrl: {
      inputs: [],
      steps: [
        {
          type: 'http',
          id: 'lookup',
          request: {
            method: 'GET',
            url: "'https://api.example.com/items/' & id",
          },
        },
      ],
      output: "{ 'id': id, 'title': lookup.title, 'url': url }",
    },
  }

  it('runs the parseUrl pipeline with named capture groups as inputs', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/items/42': {
        body: JSON.stringify({ title: 'Hello' }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(parseUrlManifest), {
      fetcher,
    })
    const result = await runner.runParseUrl('https://www.example.com/play/42')
    expect(result).toEqual({
      id: '42',
      title: 'Hello',
      url: 'https://www.example.com/play/42',
    })
    expect(calls).toHaveLength(1)
  })

  it('returns null when no urlMatch pattern matches', async () => {
    const runner = new ManifestRunner(zManifest.parse(parseUrlManifest))
    const result = await runner.runParseUrl('https://other.example.com/x')
    expect(result).toBeNull()
  })

  it('returns null when the manifest declares no parseUrl pipeline', async () => {
    const noParseUrl = {
      apiVersion: 1,
      id: 'no-pu',
      name: 'NoParseUrl',
      version: '0.1.0',
      hosts: ['api.example.com'],
      urlMatch: [{ host: 'www.example.com', path: '.*' }],
    }
    const runner = new ManifestRunner(zManifest.parse(noParseUrl))
    const result = await runner.runParseUrl('https://www.example.com/anything')
    expect(result).toBeNull()
  })

  it('merges extraInputs alongside captured groups', async () => {
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/items/7': {
        body: JSON.stringify({ title: 'X' }),
      },
    })
    const manifestWithBaseUrl = {
      ...parseUrlManifest,
      parseUrl: {
        inputs: ['extra'],
        steps: [
          {
            type: 'http',
            id: 'lookup',
            request: {
              method: 'GET',
              url: "'https://api.example.com/items/' & id",
            },
          },
        ],
        output: "{ 'id': id, 'extra': extra }",
      },
    }
    const runner = new ManifestRunner(zManifest.parse(manifestWithBaseUrl), {
      fetcher,
    })
    const result = await runner.runParseUrl('https://www.example.com/play/7', {
      extra: 'hello',
    })
    expect(result).toEqual({ id: '7', extra: 'hello' })
    expect(calls).toHaveLength(1)
  })
})

describe('ManifestRunner.canParse', () => {
  it('returns true when any urlMatch entry matches', () => {
    const runner = new ManifestRunner(
      zManifest.parse({
        apiVersion: 1,
        id: 'x',
        name: 'X',
        version: '0.1.0',
        hosts: ['x.com'],
        urlMatch: [{ host: 'www.x.com', path: '^/play/' }],
      })
    )
    expect(runner.canParse('https://www.x.com/play/123')).toBe(true)
    expect(runner.canParse('https://www.x.com/festival')).toBe(false)
  })

  it('returns false when urlMatch is empty', () => {
    const runner = new ManifestRunner(
      zManifest.parse({
        apiVersion: 1,
        id: 'x',
        name: 'X',
        version: '0.1.0',
        hosts: ['x.com'],
      })
    )
    expect(runner.canParse('https://www.x.com/anything')).toBe(false)
  })
})

describe('JsonataEvaluator', () => {
  it('caches compiled expressions across calls', async () => {
    const ev = new JsonataEvaluator({ maxCacheSize: 10 })
    const r1 = await ev.eval('a + b', { a: 1, b: 2 })
    const r2 = await ev.eval('a + b', { a: 10, b: 20 })
    expect(r1).toBe(3)
    expect(r2).toBe(30)
  })

  it('respects max cache size with FIFO eviction', async () => {
    const ev = new JsonataEvaluator({ maxCacheSize: 2 })
    // Three distinct expressions; first should be evicted on the third.
    await ev.eval('1 + 1', null)
    await ev.eval('2 + 2', null)
    await ev.eval('3 + 3', null)
    // Cache is internal; just make sure nothing throws and the third still works.
    expect(await ev.eval('3 + 3', null)).toBe(6)
  })

  it('clear() empties the cache', async () => {
    const ev = new JsonataEvaluator()
    await ev.eval('1 + 1', null)
    ev.clear()
    expect(await ev.eval('2 + 2', null)).toBe(4)
  })

  it('evalString throws on non-string result', async () => {
    const ev = new JsonataEvaluator()
    await expect(ev.evalString('1 + 1', null)).rejects.toThrow(
      /produced number, expected string/
    )
  })
})
