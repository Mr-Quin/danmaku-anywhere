import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { poweredBy } from 'hono/powered-by'
import { prettyJSON } from 'hono/pretty-json'
import { useCache } from '@/middleware/cache'
import { danDanPlay } from '@/routes/api/ddp/danDanPlay'
import { llmLegacy } from '@/routes/api/llm/llm'
import { factory } from './factory'
import { api } from './routes/api/routes'

const app = factory.createApp()

app.use(
  '*',
  logger(),
  prettyJSON(),
  cors({
    origin: (origin, c) => {
      const allowedOrigins = c.env.ALLOWED_ORIGIN.split(',')
      if (allowedOrigins.includes(origin)) {
        return origin
      }
      return allowedOrigins[0]
    },
    allowMethods: ['POST', 'GET', 'OPTIONS'],
  }),
  poweredBy({
    serverName: 'DanmakuAnywhere',
  })
)

app.route('/', api)

app.use('/proxy/api/*', useCache())
app.route('/proxy/api', danDanPlay)
app.route('/proxy/gemini', llmLegacy)

app.notFound((c) => {
  return c.json({ message: 'Not Found', success: false }, { status: 404 })
})

app.onError((error, c) => {
  console.error('Error processing request:', error)

  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
        success: false,
      },
      {
        status: error.status,
      }
    )
  }

  // Handle other types of errors
  const message = error.message
  const status = 500

  return c.json({ message, success: false }, { status })
})

export default {
  fetch: app.fetch,
}
