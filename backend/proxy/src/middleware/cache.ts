import type { Context, HonoRequest } from 'hono'
import { factory } from '@/factory'
import { sha256, tryCatch } from '@/utils'
import { computeEtag } from '@/utils/computeEtag'

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

interface RequestCacheControl {
  noStore?: boolean
  noCache?: boolean
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

function parseCacheControl(header?: string): RequestCacheControl {
  if (!header) return {}

  const directives: RequestCacheControl = {}
  for (const part of header.split(',')) {
    let [key, value] = part.trim().split('=')
    key = key.toLowerCase()

    if (key === 'no-store') {
      directives.noStore = true
    } else if (key === 'no-cache') {
      directives.noCache = true
    } else if (key === 'max-age' && value) {
      const maxAgeNum = Number.parseInt(value, 10)
      if (!Number.isNaN(maxAgeNum) && maxAgeNum === 0) {
        directives.noCache = true
      }
    }
  }
  return directives
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

    const cacheControlHeader = c.req.header('Cache-Control')
    const directives = parseCacheControl(cacheControlHeader)

    console.log('Cache-Control:', cacheControlHeader)

    if (directives.noStore) {
      console.log('no-store, skip cache')
      return await next()
    }

    const cacheKey = customGetCacheKey
      ? await customGetCacheKey(c)
      : await defaultGetCacheKey(c, methods)

    if (!cacheKey) {
      console.log('no cache key, skip cache')
      return await next()
    }

    const noCache = directives.noCache

    const cache = caches.default

    if (!noCache) {
      // Attempt to read from cache unless no-cache is set
      const cachedResponse = await cache.match(cacheKey)

      if (cachedResponse) {
        const clientETag = c.req.header('If-None-Match')
        const serverETag = cachedResponse.headers.get('ETag')

        if (
          clientETag &&
          serverETag &&
          (clientETag === '*' ||
            clientETag
              .split(',')
              .map((t) => t.trim())
              .includes(serverETag))
        ) {
          console.log('Cache hit, 304')
          return new Response(null, {
            status: 304,
            headers: cachedResponse.headers,
          })
        }

        const logMessage = logPrefix
          ? `${logPrefix} Cache hit!`
          : `${c.req.path} Cache hit!`
        console.log(logMessage)
        return cachedResponse
      }
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

      try {
        const bodyText = await response.clone().text()
        const etag = await computeEtag(bodyText)
        if (etag) {
          response.headers.set('ETag', etag)
        }
      } catch (e) {
        console.error('Failed to compute ETag:', e)
      }

      const logMessage = logPrefix
        ? `${logPrefix} Cache set!`
        : `${c.req.path} Cache set!`

      console.log(logMessage)

      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    }
  })
}
