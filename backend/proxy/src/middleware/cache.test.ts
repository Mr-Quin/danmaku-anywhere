import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCache } from './cache'

describe('Cache Middleware', () => {
  let app: Hono
  let handlerSpy: ReturnType<typeof vi.fn>
  const pendingWaitUntil: Promise<any>[] = []

  // In-memory cache mock
  const memoryCache = new Map<string, Response>()

  const mockCache = {
    match: async (key: Request | string) => {
      // Middleware passes Request object
      const k = key instanceof Request ? key.url : key.toString()
      const res = memoryCache.get(k)
      // Return clone to simulate real cache behavior (body stream)
      return res ? res.clone() : undefined
    },
    put: async (key: Request | string, res: Response) => {
      const k = key instanceof Request ? key.url : key.toString()
      // Store clone
      memoryCache.set(k, res.clone())
    },
  }

  // Mock ExecutionContext for Hono
  const mockExecutionCtx = {
    waitUntil: (promise: Promise<any>) => {
      pendingWaitUntil.push(promise)
    },
    passThroughOnException: () => {},
  } as ExecutionContext

  beforeEach(async () => {
    // Stub global caches
    // Note: In vitest-pool-workers, 'caches' is available. We override it.
    vi.stubGlobal('caches', { default: mockCache })
    memoryCache.clear()

    app = new Hono()
    handlerSpy = vi.fn((c) => c.json({ data: 'test', timestamp: Date.now() }))
    pendingWaitUntil.length = 0
  })

  afterEach(async () => {
    await Promise.all(pendingWaitUntil)
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
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // First request
    const res1 = await app.request(path, {}, mockExecutionCtx)
    expect(res1.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Ensure cache put finished
    await Promise.all(pendingWaitUntil)

    // Second request
    const res2 = await app.request(path, {}, mockExecutionCtx)
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
    const res1 = await app.request(
      path,
      {
        headers: { 'Cache-Control': 'no-store' },
      },
      mockExecutionCtx
    )
    expect(res1.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    await Promise.all(pendingWaitUntil)

    // Second request standard (should miss because first wasn't stored)
    const res2 = await app.request(path, {}, mockExecutionCtx)
    expect(res2.status).toBe(200)
    expect(handlerSpy).toHaveBeenCalledTimes(2)
  })

  it('respects no-cache in request', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache first
    await app.request(path, {}, mockExecutionCtx)
    await Promise.all(pendingWaitUntil)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Request with no-cache (should bypass cache lookup but store result)
    const res2 = await app.request(
      path,
      {
        headers: { 'Cache-Control': 'no-cache' },
      },
      mockExecutionCtx
    )
    await Promise.all(pendingWaitUntil)
    expect(handlerSpy).toHaveBeenCalledTimes(2)

    // Third request should hit the *updated* cache
    const res3 = await app.request(path, {}, mockExecutionCtx)
    expect(handlerSpy).toHaveBeenCalledTimes(2)
    const data2 = await res2.json()
    const data3 = await res3.json()
    expect(data3).toEqual(data2)
  })

  it('respects max-age=0 in request', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache
    await app.request(path, {}, mockExecutionCtx)
    await Promise.all(pendingWaitUntil)
    expect(handlerSpy).toHaveBeenCalledTimes(1)

    // Request with max-age=0 (should force validation/fetch)
    await app.request(
      path,
      {
        headers: { 'Cache-Control': 'max-age=0' },
      },
      mockExecutionCtx
    )
    expect(handlerSpy).toHaveBeenCalledTimes(2)
  })

  it('respects max-age=N in request (fresh)', async () => {
    createTestApp({ maxAge: 60 })
    const path = `/${Math.random()}`

    // Populate cache
    await app.request(path, {}, mockExecutionCtx)
    await Promise.all(pendingWaitUntil)

    // Request with max-age=large (should accept cached)
    await app.request(
      path,
      {
        headers: { 'Cache-Control': 'max-age=100' },
      },
      mockExecutionCtx
    )
    expect(handlerSpy).toHaveBeenCalledTimes(1)
  })

  it('respects max-age=N in request (stale)', async () => {
    // Custom cache setup to inject old response
    const path = `/stale-test-${Math.random()}`
    const oldDate = new Date(Date.now() - 10000).toUTCString() // 10 seconds ago

    // We need to manually put something into the cache with an old date
    // Note: The key must match exactly what middleware generates (likely full URL)
    const cacheKey = `http://localhost${path}`
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
    await app.request(
      path,
      {
        headers: { 'Cache-Control': 'max-age=5' },
      },
      mockExecutionCtx
    )

    // Handler should be called because cache was stale for this client
    expect(handlerSpy).toHaveBeenCalledTimes(1)
  })
})
