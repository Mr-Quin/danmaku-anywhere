import { factory } from '@/factory'

const verifyPathQuery = factory.createMiddleware(async (c, next) => {
  const path = c.req.query('path')

  if (!path) {
    return c.json({ error: 'Missing required "path" query parameter' }, 400)
  }

  return next()
})

export const danDanPlay = factory.createApp()

danDanPlay.all('*', verifyPathQuery, async (c) => {
  const service = c.env.DDP_SERVICE

  const target = new URL(c.req.url)
  target.pathname = '/v1'

  const request = new Request(target.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  })

  return service.fetch(request)
})
