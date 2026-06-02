import { describeRoute, resolver } from 'hono-openapi'
import z from 'zod'
import { factory } from '@/factory'

const USER_AGENT =
  'danmaku-anywhere (https://github.com/Mr-Quin/danmaku-anywhere)'

// Bangumi only serves public data, so we forward a minimal anonymous header
// set. Dropping auth/cookie keeps every upstream call identical across users,
// which is what makes the shared response cache safe.
const FORWARDED_HEADERS = ['accept', 'accept-language', 'content-type']

const proxyDescription = describeRoute({
  description:
    'Transparent proxy to the external Bangumi API. The request and response bodies are passed through to/from Bangumi, so the response schema is defined by the upstream Bangumi endpoint rather than this service.',
  responses: {
    200: {
      description:
        'Successful proxy response from the external Bangumi API. The JSON payload is returned as-is from Bangumi and may vary depending on the proxied endpoint.',
      content: {
        'application/json': { schema: resolver(z.any()) },
      },
    },
  },
})

export function bangumiProxy(upstreamOrigin: string) {
  return factory.createHandlers(proxyDescription, async (c) => {
    const path = c.req.param('path')

    // Assigning pathname/search on the parsed origin keeps the host pinned to
    // upstreamOrigin even when the captured path looks like `//evil.com`.
    const target = new URL(upstreamOrigin)
    target.pathname = `/${path}`
    target.search = new URL(c.req.url).search

    const headers = new Headers()
    for (const name of FORWARDED_HEADERS) {
      const value = c.req.header(name)
      if (value) {
        headers.set(name, value)
      }
    }
    headers.set('user-agent', USER_AGENT)

    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD'
    const request = new Request(target, {
      method: c.req.method,
      headers,
      body: hasBody ? await c.req.raw.arrayBuffer() : undefined,
      // Don't follow upstream redirects: a 3xx could point off bgm.tv and
      // turn this into an open cross-origin proxy.
      redirect: 'manual',
    })

    return fetch(request)
  })
}
