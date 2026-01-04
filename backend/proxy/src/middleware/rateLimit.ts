import { HTTPException } from 'hono/http-exception'
import { factory } from '@/factory'
import { getIsTestEnv } from '@/utils/getIsTestEnv'

type RateLimiterKeys = 'DDP_RATE_LIMITER'

interface RateLimitOptions {
  rateLimiter: RateLimiterKeys
}

export function useRateLimiter({ rateLimiter }: RateLimitOptions) {
  return factory.createMiddleware(async (c, next) => {
    const env = c.env
    const ip = c.get('ip')

    if (!ip && !getIsTestEnv()) {
      throw new HTTPException(403, {
        message: 'Could not get IP address',
      })
    }

    const rateLimitKey = ip ?? ''

    const { success } = await env[rateLimiter].limit({
      key: `${rateLimiter}/${rateLimitKey}`,
    })

    if (!success) {
      throw new HTTPException(429, {
        message: 'Rate limit exceeded',
      })
    }

    return next()
  })
}
