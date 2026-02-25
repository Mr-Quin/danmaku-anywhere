import { GoogleGenerativeAIFetchError } from '@google/generative-ai'
import { HTTPException } from 'hono/http-exception'
import { factory } from '@/factory'

export function useGeminiErrorHandler() {
  return factory.createMiddleware(async (c, next) => {
    try {
      await next()
    } catch (error) {
      if (error instanceof GoogleGenerativeAIFetchError) {
        console.error('Error from Google Generative AI:')
        console.error(error.message)
        console.error(JSON.stringify(error.errorDetails, null, 2))
        if (error.status === 429) {
          console.error('Rate limit exceeded')
          throw new HTTPException(429, {
            message: 'Rate limit exceeded, please try again later.',
          })
        }
        throw new HTTPException(500, { message: 'Failed to extract title' })
      }
      if (error instanceof Error) {
        throw new HTTPException(500, { message: error.message })
      }

      throw new HTTPException(500, { message: 'Failed to extract title' })
    }
  })
}
