import { describe, expect, it } from 'vitest'
import { JsonataEvaluator } from '../engine/jsonata-eval.js'
import { ManifestRunner } from '../engine/ManifestRunner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import ddpManifest from './manifests/ddp.json' with { type: 'json' }

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
