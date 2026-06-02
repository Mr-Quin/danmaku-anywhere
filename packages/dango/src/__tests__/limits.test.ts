import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

/**
 * Schema and runtime guards that prevent classes of incorrect manifests from
 * loading or producing surprising behavior. These are correctness boundaries,
 * not DoS limits — vetting + user warnings handle the trust model.
 */

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
          steps: [{ type: 'assign', id: '__proto__', values: { x: '1' } }],
          output: '[]',
        },
      })
    ).toThrow(/reserved/)
  })

  it('rejects step id "constructor"', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'evil',
        name: 'evil',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [{ type: 'assign', id: 'constructor', values: { x: '1' } }],
          output: '[]',
        },
      })
    ).toThrow(/reserved/)
  })

  it('rejects step id with hyphen', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'evil',
        name: 'evil',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [{ type: 'assign', id: 'bad-name', values: { x: '1' } }],
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
          steps: [{ type: 'assign', id: 'step_1', values: { x: '1' } }],
          output: '[]',
        },
      })
    ).not.toThrow()
  })
})

describe('http step extract requires id', () => {
  it('rejects http step with extract but no id', () => {
    expect(() =>
      zManifest.parse({
        apiVersion: 1,
        id: 'bad',
        name: 'bad',
        version: '0.1.0',
        hosts: ['api.example.com'],
        search: {
          inputs: [],
          steps: [
            {
              type: 'http',
              request: { method: 'GET', url: "'https://api.example.com/x'" },
              extract: { x: 'data.x' },
            },
          ],
          output: '[]',
        },
      })
    ).toThrow(/requires `id` when `extract` \/ `extractHeaders` is set/)
  })

  it('accepts http step with id and extract', () => {
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
              type: 'http',
              id: 'r',
              request: { method: 'GET', url: "'https://api.example.com/x'" },
              extract: { x: 'data.x' },
            },
          ],
          output: '[]',
        },
      })
    ).not.toThrow()
  })

  it('accepts http step with id and no extract', () => {
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
              type: 'http',
              id: 'r',
              request: { method: 'GET', url: "'https://api.example.com/x'" },
            },
          ],
          output: '[]',
        },
      })
    ).not.toThrow()
  })
})

describe('forEach throttle with concurrency > 1', () => {
  it('spaces request starts even when multiple workers run in parallel', async () => {
    // Regression: previously the shared earliestStart was updated AFTER the
    // sleep, so two workers reading it concurrently both used the same value
    // and fired at the same instant. Slot reservation must be synchronous.
    const manifest = zManifest.parse({
      apiVersion: 1,
      id: 'throttle-race',
      name: 'throttle race',
      version: '0.1.0',
      hosts: ['api.example.com'],
      search: {
        inputs: ['q'],
        steps: [
          {
            type: 'forEach',
            id: 'loop',
            in: '$range(0, 4)',
            as: 'i',
            request: {
              method: 'GET',
              url: "'https://api.example.com/x?i=' & $string(i)",
            },
            concurrency: 4,
            throttleMs: 100,
          },
        ],
        output: 'loop',
      },
    })

    const callTimes: number[] = []
    const start = Date.now()
    const { fetcher } = mockFetcher({
      'https://api.example.com/x': () => {
        callTimes.push(Date.now() - start)
        return { body: '{}' }
      },
    })

    await runPipeline(manifest, manifest.search!, { q: 'x' }, { fetcher })

    expect(callTimes).toHaveLength(4)
    // Each consecutive call must be ≥throttleMs after the previous start.
    callTimes.sort((a, b) => a - b)
    for (let i = 1; i < callTimes.length; i++) {
      const gap = callTimes[i]! - callTimes[i - 1]!
      // Loose threshold for OS timer jitter; the pre-fix bug had gap ~0.
      expect(gap).toBeGreaterThanOrEqual(80)
    }
  })
})

describe('forEach abort during throttle sleep', () => {
  it('surfaces AbortedError promptly without waiting out the throttle', async () => {
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
    expect(Date.now() - start).toBeLessThan(1500)
  })
})
