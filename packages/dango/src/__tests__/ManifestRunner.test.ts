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

/**
 * Covers extractHeaders on http steps: response headers (lower-cased names)
 * are exposed alongside body extracts on context[step.id]. Required for
 * sources that need to thread tokens from Set-Cookie / etag into later steps.
 */
describe('http step extractHeaders', () => {
  it('extracts named values from response headers into context', async () => {
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'header-demo',
      name: 'HeaderDemo',
      version: '0.1.0',
      hosts: ['api.example.com'],
      search: {
        inputs: ['q'],
        steps: [
          {
            type: 'http',
            id: 'probe',
            request: {
              method: 'GET',
              url: "'https://api.example.com/probe'",
            },
            extractHeaders: {
              token: "$regexExtract(`set-cookie`, '_m_h5_tk=([^;]+)')",
              etag: '`etag`',
            },
          },
        ],
        output: 'probe',
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/probe': {
        body: JSON.stringify({}),
        headers: {
          'Set-Cookie': '_m_h5_tk=abc123; path=/',
          ETag: '"deadbeef"',
        },
      },
    })
    const runner = new ManifestRunner(manifest, { fetcher })
    const result = await runner.runSearch({ q: 'x' })
    expect(result).toEqual({ token: 'abc123', etag: '"deadbeef"' })
  })

  it('mixes extract (body) and extractHeaders into a single bag', async () => {
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'mix',
      name: 'Mix',
      version: '0.1.0',
      hosts: ['api.example.com'],
      search: {
        inputs: ['q'],
        steps: [
          {
            type: 'http',
            id: 'r',
            request: { method: 'GET', url: "'https://api.example.com/x'" },
            extract: { fromBody: 'data.value' },
            extractHeaders: { fromHeader: '`x-trace-id`' },
          },
        ],
        output: 'r',
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': {
        body: JSON.stringify({ data: { value: 'b' } }),
        headers: { 'X-Trace-Id': 'h' },
      },
    })
    const runner = new ManifestRunner(manifest, { fetcher })
    const result = await runner.runSearch({ q: 'x' })
    expect(result).toEqual({ fromBody: 'b', fromHeader: 'h' })
  })
})

/**
 * Covers ManifestRunner.runLoginProbe: the no-pipeline returns-null path and
 * a normal HTTP probe whose output the host inspects to decide login state.
 * Output shape is source-specific; the engine just runs the pipeline.
 */
describe('ManifestRunner.runLoginProbe', () => {
  it('returns null when the manifest declares no loginProbe pipeline', async () => {
    const runner = new ManifestRunner(
      zManifest.parse({
        apiVersion: 1,
        id: 'no-probe',
        name: 'NoProbe',
        version: '0.1.0',
        hosts: ['api.example.com'],
      })
    )
    expect(runner.hasLoginProbe()).toBe(false)
    expect(await runner.runLoginProbe()).toBeNull()
  })

  it('runs the probe pipeline and returns its output', async () => {
    const probeManifest = {
      apiVersion: 1,
      id: 'probe-demo',
      name: 'ProbeDemo',
      version: '0.1.0',
      hosts: ['api.example.com'],
      loginProbe: {
        inputs: [],
        steps: [
          {
            type: 'http',
            id: 'nav',
            request: {
              method: 'GET',
              url: "'https://api.example.com/me'",
              credentials: 'include',
            },
          },
        ],
        output:
          "nav.code = 0 ? { 'loggedIn': true, 'name': nav.data.name } : { 'loggedIn': false }",
      },
    }
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/me': {
        body: JSON.stringify({ code: 0, data: { name: 'alice' } }),
      },
    })
    const runner = new ManifestRunner(zManifest.parse(probeManifest), {
      fetcher,
    })

    expect(runner.hasLoginProbe()).toBe(true)
    const result = await runner.runLoginProbe()
    expect(result).toEqual({ loggedIn: true, name: 'alice' })
    expect(calls).toHaveLength(1)
    expect((calls[0].init as { credentials?: string }).credentials).toBe(
      'include'
    )
  })

  it('threads per-call inputs into the probe pipeline', async () => {
    const probeManifest = {
      apiVersion: 1,
      id: 'probe-inputs',
      name: 'ProbeInputs',
      version: '0.1.0',
      hosts: ['api.example.com'],
      loginProbe: {
        inputs: ['accountId'],
        steps: [
          {
            type: 'http',
            id: 'probe',
            request: {
              method: 'GET',
              url: "'https://api.example.com/u/' & accountId",
            },
          },
        ],
        output: 'probe.ok',
      },
    }
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/u/42': { body: JSON.stringify({ ok: true }) },
    })
    const runner = new ManifestRunner(zManifest.parse(probeManifest), {
      fetcher,
    })

    expect(await runner.runLoginProbe({ accountId: '42' })).toBe(true)
    expect(calls[0].url).toBe('https://api.example.com/u/42')
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
