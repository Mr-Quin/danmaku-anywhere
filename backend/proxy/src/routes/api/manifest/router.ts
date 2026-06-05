import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'
import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'

export const manifestRouter = factory.createApp()

const dangoBaseUrl =
  'https://raw.githubusercontent.com/Mr-Quin/dango/main/packages/dango-manifests'

const filePattern = /^src\/manifests\/[\w.-]+\.json$/

const oneHour = 60 * 60

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
  useCache({
    maxAge: oneHour,
  }),
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
  useCache({
    maxAge: oneHour,
  }),
  async (c) => {
    const { file } = c.req.valid('query')
    return await fetch(`${dangoBaseUrl}/${file}`)
  }
)
