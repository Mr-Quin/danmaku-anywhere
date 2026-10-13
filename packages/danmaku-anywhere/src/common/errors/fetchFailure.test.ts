import { describe, expect, it, vi } from 'vitest'
import { AppError } from './AppError'
import { classifyFetchRejection, fetchOrThrow } from './fetchFailure'

describe('classifyFetchRejection', () => {
  it('codes a plain rejection as network and keeps it as cause', () => {
    const rejection = new TypeError('Failed to fetch')

    const error = classifyFetchRejection(rejection)

    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('network')
    expect(error.cause).toBe(rejection)
  })

  it('codes a rejection after AbortSignal.timeout as timeout', () => {
    const controller = new AbortController()
    controller.abort(new DOMException('signal timed out', 'TimeoutError'))

    const error = classifyFetchRejection(
      new DOMException('aborted', 'AbortError'),
      controller.signal
    )

    expect(error.code).toBe('timeout')
  })

  it('codes a rejection after a caller abort as aborted', () => {
    const controller = new AbortController()
    controller.abort()

    const error = classifyFetchRejection(
      new DOMException('aborted', 'AbortError'),
      controller.signal
    )

    expect(error.code).toBe('aborted')
  })
})

describe('fetchOrThrow', () => {
  it('returns a 2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}'))
    )

    const response = await fetchOrThrow('https://example.com/a')

    expect(response.status).toBe(200)
  })

  it('codes a non-2xx status as http with the target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 }))
    )

    await expect(
      fetchOrThrow('https://example.com/a', {}, { kind: 'catalog' })
    ).rejects.toMatchObject({
      code: 'http',
      params: { status: 503, target: { kind: 'catalog' } },
    })
  })

  it('codes a rejection as network with the target', async () => {
    const rejection = new TypeError('Failed to fetch')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw rejection
      })
    )

    await expect(
      fetchOrThrow('https://example.com/a', {}, { kind: 'cloud' })
    ).rejects.toMatchObject({
      code: 'network',
      params: { target: { kind: 'cloud' } },
      cause: rejection,
    })
  })
})
