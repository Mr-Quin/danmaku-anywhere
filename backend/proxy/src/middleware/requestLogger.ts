import { logger } from 'hono/logger'
import { factory } from '@/factory'

const honoLogger = logger()

export const requestLogger = () =>
  factory.createMiddleware(async (context, next) => {
    if (context.env.ENVIRONMENT === 'production') {
      return next()
    }
    return honoLogger(context, next)
  })
