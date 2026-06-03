import { factory } from '@/factory'

export const ddpTransparent = factory.createApp()

ddpTransparent.all('*', async (c) => {
  const service = c.env.DDP_SERVICE

  const target = new URL(c.req.url)
  // Drop the /ddp mount prefix; the service routes on the upstream path.
  target.pathname = target.pathname.replace(/^\/ddp/, '')

  const request = new Request(target, c.req.raw)
  request.headers.delete('da-authenticated')
  if (c.get('authUser')) {
    request.headers.set('da-authenticated', '1')
  }

  return service.fetch(request)
})
