import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

// rewriteHeaders is the engine's escape hatch for sources that need wire-level
// header overrides (Origin, Referer, User-Agent) that the browser otherwise
// won't let fetch set. The engine evaluates the JSONata-expressed values and
// passes them to the FetchLike implementation in init.rewriteHeaders — the
// host (extension) wraps the fetch in runWithDnr; a server FetchLike would
// just set them directly.

const baseManifest = {
  apiVersion: 1,
  id: 'tencent-style',
  name: 'Tencent-style source',
  version: '0.1.0',
  hosts: ['pbaccess.video.qq.com'],
  search: {
    inputs: ['q'],
    steps: [
      {
        type: 'http',
        id: 'search',
        request: {
          method: 'GET',
          url: "'https://pbaccess.video.qq.com/trpc.videosearch.search_cgi/Search'",
          query: "{ 'query': q }",
          rewriteHeaders: {
            Origin: "'https://v.qq.com'",
            Referer: "'https://v.qq.com/'",
          },
        },
      },
    ],
    output: '[]',
  },
}

describe('rewriteHeaders', () => {
  it('parses and propagates rewriteHeaders through FetchLike init', async () => {
    const manifest = zManifest.parse(baseManifest)
    const { fetcher, calls } = mockFetcher({
      'https://pbaccess.video.qq.com/trpc.videosearch.search_cgi/Search': {
        body: JSON.stringify({}),
      },
    })

    await runPipeline(manifest, manifest.search!, { q: 'frieren' }, { fetcher })

    expect(calls).toHaveLength(1)
    const init = calls[0].init as {
      headers?: Record<string, string>
      rewriteHeaders?: Record<string, string>
    }
    // rewriteHeaders is a separate field, NOT mixed into plain headers
    expect(init.rewriteHeaders).toEqual({
      Origin: 'https://v.qq.com',
      Referer: 'https://v.qq.com/',
    })
    expect(init.headers).toEqual({})
  })

  it('supports config-templated rewrite values (DDP-Compat use case)', async () => {
    // A DDP-Compat-style manifest where Origin is config-driven.
    const configTemplated = {
      ...baseManifest,
      id: 'ddp-compat',
      configSchema: {
        originOverride: {
          type: 'string' as const,
          default: 'https://api.dandanplay.net',
        },
      },
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              rewriteHeaders: {
                Origin: 'originOverride',
              },
            },
          },
        ],
      },
    }
    const manifest = zManifest.parse(configTemplated)
    const { fetcher, calls } = mockFetcher({
      'https://pbaccess.video.qq.com/trpc.videosearch.search_cgi/Search': {
        body: JSON.stringify({}),
      },
    })

    await runPipeline(
      manifest,
      manifest.search!,
      { q: 'x', originOverride: 'https://my.custom.server' },
      { fetcher }
    )

    const init = calls[0].init as { rewriteHeaders?: Record<string, string> }
    expect(init.rewriteHeaders).toEqual({ Origin: 'https://my.custom.server' })
  })

  it('rejects disallowed rewrite header keys at manifest load', () => {
    const bad = {
      ...baseManifest,
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              rewriteHeaders: {
                Cookie: "'session=abc'",
              },
            },
          },
        ],
      },
    }
    expect(() => zManifest.parse(bad)).toThrow(
      /rewriteHeaders key not in allowlist/
    )
  })

  it('rejects Authorization too', () => {
    const bad = {
      ...baseManifest,
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              rewriteHeaders: {
                Authorization: "'Bearer evil'",
              },
            },
          },
        ],
      },
    }
    expect(() => zManifest.parse(bad)).toThrow(
      /rewriteHeaders key not in allowlist/
    )
  })

  it('rejects case-variants of forbidden keys (case-insensitive match)', () => {
    const bad = {
      ...baseManifest,
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              rewriteHeaders: {
                cOoKiE: "'x'",
              },
            },
          },
        ],
      },
    }
    expect(() => zManifest.parse(bad)).toThrow(
      /rewriteHeaders key not in allowlist/
    )
  })
})
