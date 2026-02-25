import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'
import { factory } from '@/factory'

export const rulesRouter = factory.createApp()

rulesRouter.get(
  '/',
  describeRoute({
    description: 'Get Kazumi rules index',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(
              z.array(
                z.object({
                  name: z.string(),
                  version: z.string(),
                  useNativePlayer: z.boolean(),
                  author: z.string(),
                  lastUpdate: z.number(),
                })
              )
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    return await fetch(
      'https://raw.githubusercontent.com/Predidit/KazumiRules/main/index.json'
    )
  }
)

rulesRouter.get(
  '/file',
  validator(
    'query',
    z.object({
      file: z.string().min(1),
    })
  ),
  describeRoute({
    description: 'Get Kazumi rule file',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(
              z.object({
                api: z.string(),
                type: z.string(),
                version: z.string(),
              })
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    const { file } = c.req.valid('query')
    return await fetch(
      `https://raw.githubusercontent.com/Predidit/KazumiRules/main/${file}`
    )
  }
)
