import { HTTPException } from 'hono/http-exception'
import { factory } from '@/factory'

export const requireClientId = factory.createMiddleware(async (c, next) => {
  const clientId = c.get('extensionId')

  if (!clientId) {
    throw new HTTPException(400, {
      message: 'Missing client id',
    })
  }

  return next()
})
