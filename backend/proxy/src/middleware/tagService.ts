import * as Sentry from '@sentry/cloudflare'
import { factory } from '@/factory'

export const tagService = factory.createMiddleware((c, next) => {
  Sentry.setTag('service', c.req.path.split('/')[1])

  return next()
})
