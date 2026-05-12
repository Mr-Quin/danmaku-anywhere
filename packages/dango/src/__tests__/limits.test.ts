import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

/**
 * Resource caps that bound what a malicious or compromised upstream can do.
 * Each test exercises a specific limit independently of the others.
 */

function trivialManifest(extra: Partial<Record<string, unknown>> = {}) {
  return zManifest.parse({
    apiVersion: 1,
    id: 'limits-test',
    name: 'Limits Test',
    version: '0.1.0',
    hosts: ['api.example.com'],
    search: {
      inputs: ['q'],
      steps: [
        {
          type: 'http',
          id: 'r',
          request: {
            method: 'GET',
            url: "'https://api.example.com/x'",
          },
        },
      ],
      output: 'r',
    },
    ...extra,
  })
}

describe('step id sanitization', () => {
  it('rejects step id "__proto__" at manifest load', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'evil',
        name: 'evil',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [
            {
              type: 'assign',
              id: '__proto__',
              values: { x: '1' },
            },
          ],
          output: '[]',
        },
      })
    ).toThrow(/reserved/)
  })

  it('rejects step id "constructor"', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'evil2',
        name: 'evil',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [
            {
              type: 'assign',
              id: 'constructor',
              values: { x: '1' },
            },
          ],
          output: '[]',
        },
      })
    ).toThrow(/reserved/)
  })

  it('rejects step id with colon or hyphen', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'evil',
        name: 'evil',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [
            {
              type: 'assign',
              id: 'bad-name',
              values: { x: '1' },
            },
          ],
          output: '[]',
        },
      })
    ).toThrow(/JS-identifier/)
  })

  it('accepts a normal identifier step id', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'ok',
        name: 'ok',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [
            {
              type: 'assign',
              id: 'step_1',
              values: { x: '1' },
            },
          ],
          output: '[]',
        },
      })
    ).not.toThrow()
  })
})

describe('forEach iteration cap', () => {
  function forEachManifest(itemsExpr: string) {
    return zManifest.parse({
      apiVersion: 1,
      id: 'foreach-cap',
      name: 'forEach cap test',
      version: '0.1.0',
      hosts: ['api.example.com'],
      search: {
        inputs: ['q'],
        steps: [
          {
            type: 'forEach',
            id: 'loop',
            in: itemsExpr,
            as: 'i',
            request: {
              method: 'GET',
              url: "'https://api.example.com/x'",
            },
          },
        ],
        output: 'loop',
      },
    })
  }

  it('rejects iteration arrays larger than maxForEachIterations', async () => {
    /** $range capped at 10k internally; force a smaller cap to test plumbing. */
    const manifest = forEachManifest('$range(0, 50)')
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: '{}' },
    })
    await expect(
      runPipeline(
        manifest,
        manifest.search!,
        { q: 'x' },
        { fetcher, maxForEachIterations: 10 }
      )
    ).rejects.toThrow(/exceeds cap 10/)
  })

  it('allows iteration counts at or under the cap', async () => {
    const manifest = forEachManifest('$range(0, 3)')
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/x': { body: '{}' },
    })
    await runPipeline(
      manifest,
      manifest.search!,
      { q: 'x' },
      { fetcher, maxForEachIterations: 10 }
    )
    expect(calls).toHaveLength(3)
  })

  it('aborts a throttled forEach sleep promptly when signal fires', async () => {
    /**
     * Reproduces the abort-during-throttle gap: a forEach with a long
     * throttleMs and an abort fired mid-loop must surface AbortedError
     * within a small window, not wait out the throttle.
     */
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'foreach-abort',
      name: 'foreach-abort',
      version: '0.1.0',
      hosts: ['api.example.com'],
      search: {
        inputs: ['q'],
        steps: [
          {
            type: 'forEach',
            id: 'loop',
            in: '$range(0, 10)',
            as: 'i',
            request: {
              method: 'GET',
              url: "'https://api.example.com/x'",
            },
            throttleMs: 5000,
          },
        ],
        output: 'loop',
      },
    })
    const controller = new AbortController()
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': () => {
        controller.abort()
        return { body: '{}' }
      },
    })
    const start = Date.now()
    await expect(
      runPipeline(
        manifest,
        manifest.search!,
        { q: 'x' },
        { fetcher, signal: controller.signal }
      )
    ).rejects.toThrow(/aborted/i)
    /** Should bail out long before the 5s throttle would elapse. */
    expect(Date.now() - start).toBeLessThan(1500)
  })
})

describe('Response body size cap', () => {
  it('rejects responses larger than maxResponseBytes', async () => {
    const manifest = trivialManifest()
    /** Body is JSON-shaped so parse doesn't fail before the size check. */
    const huge = '{"data": "' + 'a'.repeat(2 * 1024 * 1024) + '"}'
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: huge },
    })
    await expect(
      runPipeline(
        manifest,
        manifest.search!,
        { q: 'x' },
        { fetcher, maxResponseBytes: 1024 * 1024 }
      )
    ).rejects.toThrow(/exceeds maxResponseBytes/)
  })

  it('passes through under the cap', async () => {
    const manifest = trivialManifest()
    const small = JSON.stringify({ data: 'ok' })
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: small },
    })
    await expect(
      runPipeline(
        manifest,
        manifest.search!,
        { q: 'x' },
        { fetcher, maxResponseBytes: 1024 }
      )
    ).resolves.toEqual({ data: 'ok' })
  })

  it('default cap (5MB) applies when not specified', async () => {
    const manifest = trivialManifest()
    /** 6MB > default 5MB */
    const huge = '{"data": "' + 'a'.repeat(6 * 1024 * 1024) + '"}'
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': { body: huge },
    })
    await expect(
      runPipeline(manifest, manifest.search!, { q: 'x' }, { fetcher })
    ).rejects.toThrow(/exceeds maxResponseBytes/)
  })
})
