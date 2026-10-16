import { describe, expect, it } from 'vitest'
import { fetchOrThrow } from './fetchOrThrow'

describe('fetchOrThrow', () => {
  it('returns a 2xx response', async () => {
    const response = await fetchOrThrow(
      async () => new Response('{}'),
      'https://example.com/a'
    )

    expect(response.status).toBe(200)
  })

  it('codes a non-2xx status as http with the target', async () => {
    await expect(
      fetchOrThrow(
        async () => new Response('down', { status: 503 }),
        'https://example.com/a',
        {},
        { kind: 'catalog' }
      )
    ).rejects.toMatchObject({
      code: 'http',
      params: { status: 503, target: { kind: 'catalog' } },
    })
  })

  it('codes a rejection as network with the target', async () => {
    const rejection = new TypeError('Failed to fetch')

    await expect(
      fetchOrThrow(
        async () => {
          throw rejection
        },
        'https://example.com/a',
        {},
        { kind: 'cloud' }
      )
    ).rejects.toMatchObject({
      code: 'network',
      params: { target: { kind: 'cloud' } },
      cause: rejection,
    })
  })

  it('codes a rejection after the signal timed out as timeout', async () => {
    const controller = new AbortController()
    controller.abort(new DOMException('signal timed out', 'TimeoutError'))

    await expect(
      fetchOrThrow(
        async () => {
          throw new DOMException('aborted', 'AbortError')
        },
        'https://example.com/a',
        { signal: controller.signal }
      )
    ).rejects.toMatchObject({ code: 'timeout' })
  })

  it('works with a fetcher that only reports a status', async () => {
    const response = await fetchOrThrow(
      async () => ({ status: 204, text: async () => '' }),
      'https://example.com/a'
    )

    expect(response.status).toBe(204)
  })
})
