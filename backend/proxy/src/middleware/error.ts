import type { ContentfulStatusCode } from 'hono/dist/types/utils/http-status'
import { factory } from '@/factory'
import { HTTPError } from '@/utils'

export const useError = () => {
  return factory.createMiddleware(async (c, next) => {
    try {
      await next()
    } catch (error) {
      console.error('Error processing request:', error)

      if (error instanceof HTTPError) {
        return c.json(
          { message: error.message, success: false },
          { status: error.status as ContentfulStatusCode }
        )
      }

      // Handle other types of errors
      const message =
        error instanceof Error ? error.message : 'Internal Server Error'
      const status = 500

      return c.json({ message, success: false }, { status })
    }
  })
}
