import type { Context, HonoRequest } from 'hono'
import { factory } from '@/factory'
import { sha256, tryCatch } from '@/utils'

export type SetCacheControlFn = (
  request: HonoRequest,
  response: Response
) => void

export interface CacheOptions {
  /**
   * Methods to cache. Defaults to ['GET']
   */
  methods?: string[]
  /**
   * Cache control max-age in seconds. If not provided, no Cache-Control header is set
   */
  maxAge?: number
  /**
   * Custom function to set Cache-Control header on the response.
   */
  setCacheControl?: SetCacheControlFn
  /**
   * Custom cache key generator function. If not provided, uses default logic
   */
  getCacheKey?: (c: Context) => Promise<Request | null>
  /**
   * Custom log prefix for cache messages
   */
  logPrefix?: string
}

const defaultGetCacheKey = async (c: Context, methods: string[]) => {
  if (methods.includes('POST') && c.req.method === 'POST') {
    // For POST requests, hash the body to create a unique cache key
    const [body, err] = await tryCatch(() => c.req.json())
    if (err) {
      // Skip caching if JSON parsing fails
      return null
    }

    const hash = sha256(JSON.stringify(body))
    const cacheUrl = new URL(c.req.raw.url)
    cacheUrl.pathname = cacheUrl.pathname + hash

    return new Request(cacheUrl.toString(), {
      headers: c.req.raw.headers,
      method: 'GET',
    })
  }

  if (methods.includes(c.req.method)) {
    // For GET and other methods, use the raw request
    return c.req.raw
  }

  return null
}

export const useCache = (options: CacheOptions = {}) => {
  const {
    methods = ['GET'],
    maxAge,
    getCacheKey: customGetCacheKey,
    logPrefix = '',
  } = options

  return factory.createMiddleware(async (c: Context, next) => {
    // Check if method should be cached
    if (!methods.includes(c.req.method)) {
      return await next()
    }

    // Get cache key
    const cacheKey = customGetCacheKey
      ? await customGetCacheKey(c)
      : await defaultGetCacheKey(c, methods)

    if (!cacheKey) {
      return await next()
    }

    // Try to get from the cache
    const cache = caches.default
    const cachedResponse = await cache.match(cacheKey)

    if (cachedResponse) {
      const logMessage = logPrefix
        ? `${logPrefix} Cache hit!`
        : `${c.req.path} Cache hit!`
      console.log(logMessage)
      return cachedResponse
    }

    await next()

    // Cache the response if it's successful
    const response = c.res
    if (response && response.status === 200) {
      // Set Cache-Control header if maxAge is provided
      if (maxAge !== undefined) {
        response.headers.set('Cache-Control', `max-age=${maxAge}`)
      } else if (options.setCacheControl) {
        options.setCacheControl(c.req, response)
      }

      const logMessage = logPrefix
        ? `${logPrefix} Cache set!`
        : `${c.req.path} Cache set!`
      console.log(logMessage)

      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    }
  })
}
