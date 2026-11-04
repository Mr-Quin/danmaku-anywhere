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
   * Minimum seconds between forced refreshes of one cache key. A request
   * carrying no-cache, max-age=0 or no-store reaches the handler at most once
   * per interval; inside the interval it is served from the cache like any
   * other request, and its response is always stored. Unset lets every such
   * request through.
   */
  minRefreshInterval?: number
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

// Lives under a path no route serves, so a client cannot plant one by hand.
function refreshMarkerKey(cacheKey: Request): Request {
  const url = new URL(cacheKey.url)
  url.pathname = `/__cache/refresh-floor${url.pathname}`
  return new Request(url.toString())
}

// Miniflare treats a request's own no-cache as a miss on match(); the real
// Cache API ignores it. Strip it so a floored request reads the same entry
// in both.
function readKeyFor(cacheKey: Request): Request {
  const headers = new Headers(cacheKey.headers)
  headers.delete('Cache-Control')
  headers.delete('Pragma')
  return new Request(cacheKey.url, { method: cacheKey.method, headers })
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
    minRefreshInterval,
  } = options

  return factory.createMiddleware(async (c: Context, next) => {
    // Check if method should be cached
    if (!methods.includes(c.req.method)) {
      return await next()
    }

    const cacheControlHeader = c.req.header('Cache-Control')
    const directives = parseCacheControl(cacheControlHeader)
    const forcedRefresh = Boolean(directives.noStore || directives.noCache)

    if (directives.noStore && minRefreshInterval === undefined) {
      return await next()
    }

    const cacheKey = customGetCacheKey
      ? await customGetCacheKey(c)
      : await defaultGetCacheKey(c, methods)

    if (!cacheKey) {
      return await next()
    }

    const cache = caches.default

    let skipRead = directives.noCache
    let markRefresh = false

    if (forcedRefresh && minRefreshInterval !== undefined) {
      const recentlyRefreshed = await cache.match(refreshMarkerKey(cacheKey))
      skipRead = !recentlyRefreshed
      markRefresh = !recentlyRefreshed
    }

    if (!skipRead) {
      const cachedResponse = await cache.match(
        forcedRefresh ? readKeyFor(cacheKey) : cacheKey
      )

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
          return new Response(null, {
            status: 304,
            headers: cachedResponse.headers,
          })
        }

        return cachedResponse
      }
    }

    await next()

    if (markRefresh && minRefreshInterval !== undefined) {
      const marker = new Response('1', {
        headers: { 'Cache-Control': `max-age=${minRefreshInterval}` },
      })
      c.executionCtx.waitUntil(cache.put(refreshMarkerKey(cacheKey), marker))
    }

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

      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    }
  })
}
