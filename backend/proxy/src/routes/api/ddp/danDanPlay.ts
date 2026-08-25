import * as Sentry from '@sentry/cloudflare'
import { describeRoute, resolver, validator } from 'hono-openapi'
import z from 'zod'
import { factory } from '@/factory'

const sentryTagMiddleware = factory.createMiddleware(async (c, next) => {
  const path = c.req.query('path') // path looks like /v2/endpoint/..., we want to extract the endpoint
  if (path) {
    Sentry.setTag('ddp.endpoint', path.split('/')[2])
  }
  await next()
})

export const danDanPlay = factory.createApp()

danDanPlay.all(
  '*',
  validator('query', z.object({ path: z.string().min(1) })),
  sentryTagMiddleware,
  describeRoute({
    description:
      'Transparent proxy to the external DanDanPlay API. The request and response bodies are passed through to/from DanDanPlay, so the response schema is defined by the upstream DanDanPlay endpoint rather than this service.',
    responses: {
      200: {
        description:
          'Successful proxy response from the external DanDanPlay API. The JSON payload is returned as-is from DanDanPlay and may vary depending on the proxied endpoint.',
        content: {
          'application/json': { schema: resolver(z.any()) },
        },
      },
    },
  }),
  async (c) => {
    const service = c.env.DDP_SERVICE

    const target = new URL(c.req.url)
    target.pathname = '/v1'

    const request = new Request(target, c.req.raw)
    request.headers.delete('da-authenticated')
    if (c.get('authUser')) {
      request.headers.set('da-authenticated', '1')
    }

    return service.fetch(request)
  }
)
