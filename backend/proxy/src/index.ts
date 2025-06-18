import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { poweredBy } from 'hono/powered-by'
import { prettyJSON } from 'hono/pretty-json'
import { factory } from './factory'
import { useCache, useError } from './middleware'
import { api, danDanPlay, llmLegacy } from './routes/api'

const app = factory.createApp()

app.use(
  '*',
  logger(),
  prettyJSON(),
  useError(),
  cors({
    origin: (_, c) => c.env.ALLOWED_ORIGIN,
    allowMethods: ['POST', 'GET', 'OPTIONS'],
  }),
  poweredBy({
    serverName: 'DanmakuAnywhere',
  })
)

app.route('/api/v1', api)

// legacy routes
app.use('/proxy/api/*', useCache())
app.route('/proxy/api', danDanPlay)
app.route('/proxy/gemini', llmLegacy)

app.notFound((c) => {
  return c.json({ message: 'Not Found', success: false }, { status: 404 })
})

export default {
  fetch: app.fetch,
}
