import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'
import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'

export const manifestRouter = factory.createApp()

// New dango manifests reach users only after this tag is bumped and the worker
// is redeployed.
const dangoRef = 'v0.10.0'

const dangoBaseUrl = `https://raw.githubusercontent.com/Danmaku-Anywhere/dango/${dangoRef}/packages/dango-manifests`

const filePattern = /^src\/manifests\/[\w.-]+\.json$/

const cacheMaxAge = 15 * 60

// Anyone can send no-cache to these public routes, and each forced refresh is
// an unmetered request to raw.githubusercontent.com. Cap them per resource so
// a flood cannot trip GitHub's limits and take the catalog down for everyone.
const minRefreshInterval = 60

// biome-ignore lint/correctness/useHookAtTopLevel: a Hono middleware factory, not a React hook
const manifestCache = useCache({
  maxAge: cacheMaxAge,
  minRefreshInterval,
})

manifestRouter.get(
  '/',
  describeRoute({
    description: 'Get dango manifest catalog',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(
              z.object({
                packageVersion: z.string(),
                manifests: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    version: z.string(),
                    apiVersion: z.number(),
                    file: z.string(),
                  })
                ),
              })
            ),
          },
        },
      },
    },
  }),
  manifestCache,
  async (c) => {
    return await fetch(`${dangoBaseUrl}/catalog.json`)
  }
)

manifestRouter.get(
  '/file',
  validator(
    'query',
    z.object({
      file: z.string().regex(filePattern),
    })
  ),
  describeRoute({
    description: 'Get a dango manifest file',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(z.object({}).passthrough()),
          },
        },
      },
    },
  }),
  manifestCache,
  async (c) => {
    const { file } = c.req.valid('query')
    return await fetch(`${dangoBaseUrl}/${file}`)
  }
)
