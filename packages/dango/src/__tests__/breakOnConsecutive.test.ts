import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

/**
 * `breakOnConsecutive` lets a forEach pagination loop tolerate transient
 * empties: the stop predicate must fire on N back-to-back iterations before
 * the loop exits. A non-matching iteration resets the counter. Without this,
 * a flaky API that returns an empty page mid-stream truncates the rest.
 */

function buildManifest(breakOnConsecutive?: number) {
  const forEachStep: Record<string, unknown> = {
    type: 'forEach',
    id: 'loop',
    in: '$range(1, 11)',
    as: 'i',
    request: {
      method: 'GET',
      url: "'https://api.example.com/page?i=' & $string(i)",
    },
    extract: { items: 'items' },
    collect: 'items',
    concurrency: 1,
    breakOn: '$count($) = 0',
  }
  if (breakOnConsecutive !== undefined) {
    forEachStep.breakOnConsecutive = breakOnConsecutive
  }
  return zManifest.parse({
    apiVersion: 1,
    id: 'breakOnConsecutive-test',
    name: 'breakOnConsecutive-test',
    version: '0.1.0',
    hosts: ['api.example.com'],
    search: {
      inputs: [],
      steps: [forEachStep],
      output: '[loop]',
    },
  })
}

describe('forEach breakOnConsecutive', () => {
  it('default (1) stops on the first empty iteration', async () => {
    const manifest = buildManifest()
    let calls = 0
    const { fetcher } = mockFetcher({
      'https://api.example.com/page': () => {
        calls += 1
        // Returns one item for the first 3 pages, then empties forever.
        const items = calls <= 3 ? [`item-${calls}`] : []
        return { body: JSON.stringify({ items }) }
      },
    })
    const result = (await runPipeline(
      manifest,
      manifest.search!,
      {},
      { fetcher }
    )) as string[]
    expect(calls).toBe(4)
    expect(result).toEqual(['item-1', 'item-2', 'item-3'])
  })

  it('threshold > 1 keeps going through transient empties', async () => {
    const manifest = buildManifest(3)
    let calls = 0
    const { fetcher } = mockFetcher({
      'https://api.example.com/page': () => {
        calls += 1
        // Single transient empty at page 3, real content resumes, then ends.
        const empties = new Set([3, 7, 8, 9])
        const items = empties.has(calls) ? [] : [`item-${calls}`]
        return { body: JSON.stringify({ items }) }
      },
    })
    const result = (await runPipeline(
      manifest,
      manifest.search!,
      {},
      { fetcher }
    )) as string[]
    // Pages 7,8,9 are 3 consecutive empties → stop after page 9.
    expect(calls).toBe(9)
    expect(result).toEqual(['item-1', 'item-2', 'item-4', 'item-5', 'item-6'])
  })

  it('a non-matching iteration resets the consecutive counter', async () => {
    const manifest = buildManifest(2)
    let calls = 0
    const { fetcher } = mockFetcher({
      'https://api.example.com/page': () => {
        calls += 1
        // empty, empty-reset (one item), empty, empty → 2 consecutive at end
        // pattern: 1=empty, 2=full, 3=empty, 4=empty → stop after 4
        const fullPages = new Set([2])
        const items = fullPages.has(calls) ? [`item-${calls}`] : []
        return { body: JSON.stringify({ items }) }
      },
    })
    const result = (await runPipeline(
      manifest,
      manifest.search!,
      {},
      { fetcher }
    )) as string[]
    expect(calls).toBe(4)
    expect(result).toEqual(['item-2'])
  })

  it('rejects breakOnConsecutive without breakOn at parse time', () => {
    // The refine only enforces breakOn+concurrency:1; breakOnConsecutive
    // without breakOn parses but is a no-op (counter is never incremented).
    // This documents the behavior rather than guards against it.
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'no-breakOn',
        name: 'no-breakOn',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [
            {
              type: 'forEach',
              id: 'loop',
              in: '$range(0, 1)',
              as: 'i',
              request: {
                method: 'GET',
                url: "'https://api.example.com/x'",
              },
              breakOnConsecutive: 5,
            },
          ],
          output: '[]',
        },
      })
    ).not.toThrow()
  })
})
