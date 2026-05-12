import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

// Variants let one logical pipeline (e.g. danmaku for Bilibili) declare
// multiple branches selected at run time by a `when` predicate against the
// initial inputs. Provider identity stays the same — variants are an
// implementation detail invisible to the user.

const variantManifest = {
  apiVersion: 1,
  id: 'bilibili-like',
  name: 'Bilibili-like',
  version: '0.1.0',
  hosts: ['api.example.com', 'cdn.example.com'],
  configSchema: {
    danmakuFormat: {
      type: 'enum' as const,
      values: ['xml', 'protobuf'],
      default: 'xml',
    },
  },
  danmaku: [
    {
      when: "danmakuFormat = 'protobuf'",
      inputs: ['cid'],
      steps: [
        {
          type: 'http' as const,
          id: 'seg',
          request: {
            method: 'GET' as const,
            url: "'https://api.example.com/seg.bin?oid=' & $string(cid)",
            format: 'json' as const,
          },
        },
      ],
      output: "[{ 'path': 'protobuf', 'cid': cid }]",
    },
    {
      inputs: ['cid'],
      steps: [
        {
          type: 'http' as const,
          id: 'xml',
          request: {
            method: 'GET' as const,
            url: "'https://cdn.example.com/' & $string(cid) & '.xml'",
            format: 'json' as const,
          },
        },
      ],
      output: "[{ 'path': 'xml', 'cid': cid }]",
    },
  ],
}

describe('Pipeline variants', () => {
  it('selects the variant whose when expression matches', async () => {
    const manifest = zManifest.parse(variantManifest)
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/seg.bin': { body: '{}' },
    })
    const result = await runPipeline(
      manifest,
      manifest.danmaku!,
      { cid: 12345, danmakuFormat: 'protobuf' },
      { fetcher }
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.example.com/seg.bin?oid=12345')
    expect(result).toEqual([{ path: 'protobuf', cid: 12345 }])
  })

  it('falls through to the unconditional default when no when matches', async () => {
    const manifest = zManifest.parse(variantManifest)
    const { fetcher, calls } = mockFetcher({
      'https://cdn.example.com/12345.xml': { body: '{}' },
    })
    const result = await runPipeline(
      manifest,
      manifest.danmaku!,
      { cid: 12345, danmakuFormat: 'xml' },
      { fetcher }
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://cdn.example.com/12345.xml')
    expect(result).toEqual([{ path: 'xml', cid: 12345 }])
  })

  it('default placed before conditionals is still a fallback (conditional wins)', async () => {
    // Regression: previously selectVariant short-circuited on the first
    // variant without `when`, masking later conditionals that would have matched.
    const defaultFirst = {
      ...variantManifest,
      danmaku: [
        {
          // unconditional default appears FIRST
          inputs: ['cid'],
          steps: variantManifest.danmaku[1].steps,
          output: "[{ 'path': 'xml-default', 'cid': cid }]",
        },
        {
          when: "danmakuFormat = 'protobuf'",
          inputs: ['cid'],
          steps: variantManifest.danmaku[0].steps,
          output: "[{ 'path': 'protobuf-conditional', 'cid': cid }]",
        },
      ],
    }
    const manifest = zManifest.parse(defaultFirst)
    const { fetcher } = mockFetcher({
      'https://api.example.com/seg.bin': { body: '{}' },
    })
    const result = await runPipeline(
      manifest,
      manifest.danmaku!,
      { cid: 1, danmakuFormat: 'protobuf' },
      { fetcher }
    )
    expect(result).toEqual([{ path: 'protobuf-conditional', cid: 1 }])
  })

  it('errors when no variant matches and there is no default', async () => {
    const noDefault = {
      ...variantManifest,
      danmaku: [
        {
          when: "danmakuFormat = 'protobuf'",
          inputs: ['cid'],
          steps: variantManifest.danmaku[0].steps,
          output: variantManifest.danmaku[0].output,
        },
        {
          when: "danmakuFormat = 'xml'",
          inputs: ['cid'],
          steps: variantManifest.danmaku[1].steps,
          output: variantManifest.danmaku[1].output,
        },
      ],
    }
    const manifest = zManifest.parse(noDefault)
    const { fetcher } = mockFetcher({})
    await expect(
      runPipeline(
        manifest,
        manifest.danmaku!,
        { cid: 1, danmakuFormat: 'something-else' },
        { fetcher }
      )
    ).rejects.toThrow(/no pipeline variant matched/)
  })

  it('single-pipeline form (no array) still works (normalized to length-1 variants)', async () => {
    // This is the common shape used by every existing manifest in the POC.
    const single = {
      apiVersion: 1,
      id: 'single-pipeline',
      name: 'Single Pipeline',
      version: '0.1.0',
      hosts: ['api.example.com'],
      danmaku: {
        inputs: ['cid'],
        steps: [
          {
            type: 'http' as const,
            id: 'x',
            request: {
              method: 'GET' as const,
              url: "'https://api.example.com/' & $string(cid)",
              format: 'json' as const,
            },
          },
        ],
        output: "[{ 'cid': cid }]",
      },
    }
    const manifest = zManifest.parse(single)
    // After parse, manifest.danmaku is a length-1 VariantPipeline array.
    expect(Array.isArray(manifest.danmaku)).toBe(true)
    expect(manifest.danmaku!.length).toBe(1)

    const { fetcher } = mockFetcher({
      'https://api.example.com/42': { body: '{}' },
    })
    const result = await runPipeline(
      manifest,
      manifest.danmaku!,
      { cid: 42 },
      { fetcher }
    )
    expect(result).toEqual([{ cid: 42 }])
  })
})
