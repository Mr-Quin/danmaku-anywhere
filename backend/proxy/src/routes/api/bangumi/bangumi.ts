import { describeRoute, resolver } from 'hono-openapi'
import z from 'zod'
import { factory } from '@/factory'

const USER_AGENT =
  'danmaku-anywhere (https://github.com/Mr-Quin/danmaku-anywhere)'

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
    const path = c.req.param('path') ?? ''
    const incoming = new URL(c.req.url)
    const target = new URL(`/${path}${incoming.search}`, upstreamOrigin)

    const request = new Request(target, c.req.raw)
    request.headers.delete('cookie')
    request.headers.delete('host')
    request.headers.set('user-agent', USER_AGENT)

    return fetch(request)
  })
}
