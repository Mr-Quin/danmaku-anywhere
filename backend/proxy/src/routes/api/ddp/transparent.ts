import { factory } from '@/factory'

export const ddpTransparent = factory.createApp()

// Transparent passthrough to the DDP microservice's /api/* route. The dango
// builtin:dandanplay manifest targets {host}/ddp/api/v2/...; we forward the
// path minus the /ddp mount prefix straight to the service (no ?path= rewrite).
// The legacy /ddp/v1?path= route is untouched.
ddpTransparent.all('*', async (c) => {
  const service = c.env.DDP_SERVICE

  const target = new URL(c.req.url)
  target.pathname = target.pathname.replace(/^\/ddp/, '')

  const request = new Request(target, c.req.raw)
  request.headers.delete('da-authenticated')
  if (c.get('authUser')) {
    request.headers.set('da-authenticated', '1')
  }

  return service.fetch(request)
})
