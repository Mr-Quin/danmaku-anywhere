import * as Sentry from '@sentry/cloudflare'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { poweredBy } from 'hono/powered-by'
import { prettyJSON } from 'hono/pretty-json'
import { useCache } from '@/middleware/cache'
import { setContext } from '@/middleware/setContext'
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
  }),
  setContext()
)

app.route('/', api)

app.use('/proxy/api/*', useCache())
app.route('/proxy/api', danDanPlay)
app.route('/proxy/gemini', llmLegacy)

app.notFound((c) => {
  return c.json({ message: 'Not Found', success: false }, { status: 404 })
})

app.onError((error, c) => {
  Sentry.captureException(error)
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

export default Sentry.withSentry((env: Env) => {
  const { id: versionId } = env.CF_VERSION_METADATA
  return {
    dsn: 'https://a57c6ba48bc0da21d4c6f7074e7a6f0e@o4509744978460672.ingest.us.sentry.io/4509744987308032',
    release: versionId,
    sendDefaultPii: true,
    enableLogs: true,
    tracesSampleRate: 1.0,
  }
}, app)
