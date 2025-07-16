import type { Context } from 'hono'
import { factory } from '@/factory'

export const useCache = () => {
  return factory.createMiddleware(async (c: Context, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return await next()
    }

    // Try to get from the cache
    const cache = caches.default
    const cachedResponse = await cache.match(c.req.raw)

    if (cachedResponse) {
      console.log('Cache hit!')
      return cachedResponse
    }

    await next()

    // Cache the response if it's successful
    const response = c.res
    if (response && response.status === 200) {
      console.log('Cache set!')
      c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()))
      c.res = response
    }
  })
}
