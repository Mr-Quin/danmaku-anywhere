import { describe, expect, it } from 'vitest'
import { ManifestRunner } from '../engine/ManifestRunner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'

/**
 * `request.headers` accepts either a static `{ name: expr }` record or a
 * single JSONata expression evaluating to a `{ name: value }` object. The
 * latter is needed when header names are dynamic (e.g. user-supplied auth
 * header lists in `builtin:ddp-compat`).
 */

const baseManifest = {
  apiVersion: 1,
  id: 'dynamic-headers',
  name: 'Dynamic headers',
  version: '0.0.0',
  hosts: ['api.example.com'],
  search: {
    inputs: ['q', 'authHeaders'],
    steps: [
      {
        type: 'http',
        id: 'search',
        request: {
          method: 'GET',
          url: "'https://api.example.com/search'",
          query: "{ 'q': q }",
          headers: '$merge(authHeaders.{ key: value })',
        },
      },
    ],
    output: '[search]',
  },
}

describe('request.headers single-expression form', () => {
  it('evaluates a string expression into a header object', async () => {
    const manifest = zManifest.parse(baseManifest)
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/search?q=x': { body: '{}' },
    })
    const runner = new ManifestRunner(manifest, { fetcher })

    await runner.runSearch({
      q: 'x',
      authHeaders: [
        { key: 'X-Token', value: 'abc' },
        { key: 'X-Tenant', value: 'team' },
      ],
    })

    const init = calls[0].init as { headers?: Record<string, string> }
    expect(init.headers).toEqual({ 'X-Token': 'abc', 'X-Tenant': 'team' })
  })

  it('treats undefined / null expression result as no headers', async () => {
    const manifest = zManifest.parse(baseManifest)
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/search?q=x': { body: '{}' },
    })
    const runner = new ManifestRunner(manifest, { fetcher })

    await runner.runSearch({ q: 'x', authHeaders: [] })

    const init = calls[0].init as { headers?: Record<string, string> }
    expect(init.headers).toEqual({})
  })

  it('rejects a forbidden header from the expression result', async () => {
    const manifest = zManifest.parse({
      ...baseManifest,
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              headers: "{ 'Authorization': 'Bearer xxx' }",
            },
          },
        ],
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/search?q=x': { body: '{}' },
    })
    const runner = new ManifestRunner(manifest, { fetcher })

    await expect(runner.runSearch({ q: 'x', authHeaders: [] })).rejects.toThrow(
      /not allowed in manifest/
    )
  })

  it('throws when the expression evaluates to a non-object', async () => {
    const manifest = zManifest.parse({
      ...baseManifest,
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              headers: "'not-an-object'",
            },
          },
        ],
      },
    })
    const { fetcher } = mockFetcher({
      'https://api.example.com/search?q=x': { body: '{}' },
    })
    const runner = new ManifestRunner(manifest, { fetcher })

    await expect(runner.runSearch({ q: 'x', authHeaders: [] })).rejects.toThrow(
      /must evaluate to an object/
    )
  })

  it('still accepts the static record form', async () => {
    const manifest = zManifest.parse({
      ...baseManifest,
      search: {
        ...baseManifest.search,
        steps: [
          {
            ...baseManifest.search.steps[0],
            request: {
              ...baseManifest.search.steps[0].request,
              headers: { 'X-Static': "'fixed'" },
            },
          },
        ],
      },
    })
    const { fetcher, calls } = mockFetcher({
      'https://api.example.com/search?q=x': { body: '{}' },
    })
    const runner = new ManifestRunner(manifest, { fetcher })

    await runner.runSearch({ q: 'x', authHeaders: [] })

    const init = calls[0].init as { headers?: Record<string, string> }
    expect(init.headers).toEqual({ 'X-Static': 'fixed' })
  })
})
