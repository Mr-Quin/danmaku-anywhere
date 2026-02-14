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
            schema: resolver(z.any()),
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
  describeRoute({
    description: 'Get Kazumi rule file',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(z.any()),
          },
        },
      },
    },
  }),
  validator(
    'query',
    z.object({
      file: z.string().min(1),
    })
  ),
  async (c) => {
    const { file } = c.req.valid('query')
    return await fetch(
      `https://raw.githubusercontent.com/Predidit/KazumiRules/main/${file}`
    )
  }
)
