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
    description: 'Proxy to DanDanPlay API',
    responses: {
      200: {
        description: 'Proxy response',
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

    return service.fetch(request)
  }
)
