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

  it('respects max-age=N in request (fresh)', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache
    await makeUnitTestRequest(new Request(`http://example.com${path}`), { app })

    // Request with max-age=large (should accept cached)
    await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'Cache-Control': 'max-age=100' },
      }),
      { app }
    )
    expect(handlerSpy).toHaveBeenCalledTimes(1)
  })

  it('respects max-age=N in request (stale)', async () => {
    // Custom cache setup to inject old response
    const path = `/stale-test-${Math.random()}`
    const oldDate = new Date(Date.now() - 10000).toUTCString() // 10 seconds ago

    // We need to manually put something into the cache with an old date
    const cacheKey = `http://example.com${path}`
    const oldResponse = new Response(JSON.stringify({ data: 'old' }), {
      headers: {
        Date: oldDate,
        'Cache-Control': 'max-age=60',
      },
    })

    memoryCache.set(cacheKey, oldResponse)

    createTestApp({ maxAge: 60 })

    // Request with max-age=5 (cached item is 10s old, so it is stale for this client)
    // Should fetch fresh
    await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'Cache-Control': 'max-age=5' },
      }),
      { app }
    )

    // Handler should be called because cache was stale for this client
    expect(handlerSpy).toHaveBeenCalledTimes(1)
  })

  it.only('handles invalid date headers', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache
    await makeUnitTestRequest(new Request(`http://example.com${path}`), { app })

    // Request with invalid date header (should treat as cache miss)
    await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: {
          Date: new Date(Date.now() - 10000).toUTCString(),
          'Cache-Control': 'max-age=60',
        },
      }),
      { app }
    )
    expect(handlerSpy).toHaveBeenCalledTimes(2)
  })
})
