import { factory } from '@/factory'

// Workers Cache keeps a 200 with no Cache-Control for two hours under heuristic freshness,
// and cookies are not part of its key. A route that wants caching says so with its own
// header; anything else must not end up in a shared cache.
export const noStoreDefault = () =>
  factory.createMiddleware(async (c, next) => {
    await next()
    if (c.res.headers.has('Cache-Control')) {
      return
    }
    const headers = new Headers(c.res.headers)
    headers.set('Cache-Control', 'no-store')
    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers,
    })
  })
