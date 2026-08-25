import { logger } from 'hono/logger'
import { factory } from '@/factory'

const honoLogger = logger()

/**
 * Per-request logging outside production only. Two console lines per request is real
 * CPU at the proxy's volume, and production request data comes from Workers analytics.
 */
export const requestLogger = () =>
  factory.createMiddleware(async (context, next) => {
    if (context.env.ENVIRONMENT === 'production') {
      return next()
    }
    return honoLogger(context, next)
  })
