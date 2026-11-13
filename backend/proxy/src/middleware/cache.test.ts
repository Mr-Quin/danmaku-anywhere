import type { Handler, Hono } from 'hono'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { factory } from '@/factory'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import { useCache } from './cache'

describe('Cache Middleware', () => {
  let app: Hono<{ Bindings: Env }>
  let handlerSpy: Mock<Handler<{ Bindings: Env }>>

  // Exercises the real Miniflare `caches.default`. The Cache API has no
  // clear-all, so every test uses a random path to avoid colliding with
  // entries the previous tests stored in the file-scoped cache.
  beforeEach(async () => {
    let callCount = 0
    handlerSpy = vi.fn<Handler<{ Bindings: Env }>>((c) => {
      callCount += 1
      return c.json({ data: 'test', n: callCount })
    })
  })

  // Helper to create app with options
  const createTestApp = (options = {}) => {
    app = factory.createApp()
    app.use('*', useCache(options))
    app.get('/:id', handlerSpy)
    return app
  }

  it('caches GET requests by default', async () => {
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

  describe('minRefreshInterval', () => {
    const forced = (path: string, cacheControl = 'no-cache') =>
      makeUnitTestRequest(
        new Request(`http://example.com${path}`, {
          headers: { 'Cache-Control': cacheControl },
        }),
        { app }
      )

    it('lets one forced refresh through per interval and serves the rest from cache', async () => {
      createTestApp({ maxAge: 60, minRefreshInterval: 60 })
      const path = `/${Math.random()}`

      await makeUnitTestRequest(new Request(`http://example.com${path}`), {
        app,
      })
      expect(handlerSpy).toHaveBeenCalledTimes(1)

      const res2 = await forced(path)
      expect(res2.status).toBe(200)
      expect(handlerSpy).toHaveBeenCalledTimes(2)

      const res3 = await forced(path)
      expect(res3.status).toBe(200)
      expect(handlerSpy).toHaveBeenCalledTimes(2)
      expect(await res3.json()).toEqual(await res2.json())

      const res4 = await forced(path, 'max-age=0')
      expect(res4.status).toBe(200)
      expect(handlerSpy).toHaveBeenCalledTimes(2)
    })

    it('counts no-store as a forced refresh and stores its response', async () => {
      createTestApp({ maxAge: 60, minRefreshInterval: 60 })
      const path = `/${Math.random()}`

      const res1 = await forced(path, 'no-store')
      expect(res1.status).toBe(200)
      expect(handlerSpy).toHaveBeenCalledTimes(1)

      const res2 = await forced(path, 'no-store')
      expect(res2.status).toBe(200)
      expect(handlerSpy).toHaveBeenCalledTimes(1)
      expect(await res2.json()).toEqual(await res1.json())

      await makeUnitTestRequest(new Request(`http://example.com${path}`), {
        app,
      })
      expect(handlerSpy).toHaveBeenCalledTimes(1)
    })

    it('still runs the handler on a floored request when nothing is cached', async () => {
      // A failing upstream marks the interval without storing a response.
      const failingApp = factory.createApp()
      failingApp.use('*', useCache({ maxAge: 60, minRefreshInterval: 60 }))
      failingApp.get('/:id', (c) => c.text('upstream down', 502))
      const path = `/${Math.random()}`

      const res1 = await makeUnitTestRequest(
        new Request(`http://example.com${path}`, {
          headers: { 'Cache-Control': 'no-cache' },
        }),
        { app: failingApp }
      )
      expect(res1.status).toBe(502)

      createTestApp({ maxAge: 60, minRefreshInterval: 60 })
      const res2 = await forced(path)
      expect(res2.status).toBe(200)
      expect(handlerSpy).toHaveBeenCalledTimes(1)
    })

    it('lets a forced refresh through again once the interval has passed', async () => {
      createTestApp({ maxAge: 60, minRefreshInterval: 1 })
      const path = `/${Math.random()}`

      await forced(path)
      expect(handlerSpy).toHaveBeenCalledTimes(1)
      await forced(path)
      expect(handlerSpy).toHaveBeenCalledTimes(1)

      await new Promise((resolve) => setTimeout(resolve, 2100))

      await forced(path)
      expect(handlerSpy).toHaveBeenCalledTimes(2)
    })
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
    const etag = res1.headers.get('ETag') ?? ''
    expect(etag).not.toBe('')

    // Second request with matching If-None-Match
    const res2 = await makeUnitTestRequest(
      new Request(`http://example.com${path}`, {
        headers: { 'If-None-Match': etag },
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
