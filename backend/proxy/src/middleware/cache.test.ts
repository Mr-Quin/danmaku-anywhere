import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import { useCache } from './cache'

// In-memory cache mock
const memoryCache = new Map<string, Response>()

const mockCache = {
  match: async (key: Request | string) => {
    const k = (key as Request).url || key.toString()
    const res = memoryCache.get(k)
    return res ? res.clone() : undefined
  },
  put: async (key: Request | string, res: Response) => {
    const k = (key as Request).url || key.toString()
    memoryCache.set(k, res.clone())
  },
}

describe('Cache Middleware', () => {
  let app: Hono
  let handlerSpy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Stub global caches
    vi.stubGlobal('caches', { default: mockCache })
    memoryCache.clear()

    app = new Hono()
    handlerSpy = vi.fn((c) => c.json({ data: 'test', timestamp: Date.now() }))
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
  })

  // Helper to create app with options
  const createTestApp = (options = {}) => {
    app = new Hono()
    app.use('*', useCache(options))
    app.get('/:id', handlerSpy)
    return app
  }

  it('caches GET requests by default', async () => {
    expect(caches.default).toBe(mockCache)

    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // First request
    const res1 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`),
      { app }
    )

    expect(res1.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Second request
    const res2 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`),
      { app }
    )

    expect(res2.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(1) // Should invoke cache, not handler

    const data1 = await res1.json()
    const data2 = await res2.json()
    expect(data1).toEqual(data2)
  })

  it('respects no-store in request', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // First request with no-store
    const res1 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'Cache-Control': 'no-store' },
      }),
      { app }
    )

    expect(res1.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Second request standard (should miss because first wasn't stored)
    const res2 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`),
      { app }
    )

    expect(res2.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(2)
  })

  it('respects no-cache in request', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache first
    await makeUnitTestRequest(new Request(`http://example.com${path}`), { app })
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Request with no-cache (should bypass cache lookup but store result)
    const res2 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'Cache-Control': 'no-cache' },
      }),
      { app }
    )
    expect(handlerSpy).toHaveBeenCalledTimes(2)

    // Third request should hit the *updated* cache
    const res3 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`),
      { app }
    )

    expect(handlerSpy).toHaveBeenCalledTimes(2)
    const data2 = await res2.json()
    const data3 = await res3.json()
    expect(data3).toEqual(data2)
  })

  it('respects max-age=0 in request', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache
    await makeUnitTestRequest(new Request(`http://example.com${path}`), { app })
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Request with max-age=0 (should force validation/fetch)
    await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'Cache-Control': 'max-age=0' },
      }),
      { app }
    )
    expect(handlerSpy).toHaveBeenCalledTimes(2)
  })

  it('sets ETag header on response', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    const res = await makeUnitTestRequest(
      new Request(`http://example.com${path}`),
      { app }
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).toBeDefined()
  })

  it('returns 304 when If-None-Match matches ETag', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // First request to populate cache and get ETag
    const res1 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`),
      { app }
    )
    const etag = res1.headers.get('ETag')
    expect(etag).toBeDefined()

    // Second request with matching If-None-Match
    const res2 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'If-None-Match': etag! },
      }),
      { app }
    )

    expect(res2.status).toBe(304)
    expect(handlerSpy).toHaveBeenCalledTimes(1) // Should be a cache hit (304)
    // 304 response should not have a body
    expect(await res2.text()).toBe('')
  })

  it('returns 200 when If-None-Match does not match', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // First request to populate cache
    await makeUnitTestRequest(new Request(`http://example.com${path}`), { app })

    // Second request with non-matching If-None-Match
    const res2 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'If-None-Match': '"invalid-etag"' },
      }),
      { app }
    )

    expect(res2.status).toBe(200)
    // Should still be a cache hit (just not 304)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Verify we got the data
    const data = (await res2.json()) as { data: string }
    expect(data.data).toBe('test')
  })
})
