import { describeRoute, resolver } from 'hono-openapi'
import { z } from 'zod'
import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
import { policyRouter } from './policy/controller'
import { danmuIcuBaseUrls } from './urls/danmuicu'
import { macCmsBaseUrls } from './urls/maccms'

export const configRouter = factory.createApp()

const baseUrlsSchema = z.object({
  baseUrls: z.array(z.string()),
})

configRouter.get(
  '/maccms',
  describeRoute({
    description: 'Get MacCMS base URLs',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': { schema: resolver(baseUrlsSchema) },
        },
      },
    },
  }),
  useCache({
    maxAge: 60 * 60 * 24,
  }),
  (c) => {
    return c.json({ baseUrls: macCmsBaseUrls })
  }
)

configRouter.get(
  '/danmuicu',
  describeRoute({
    description: 'Get DanmuICU base URLs',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': { schema: resolver(baseUrlsSchema) },
        },
      },
    },
  }),
  useCache({
    maxAge: 60 * 60 * 24,
  }),
  (c) => {
    return c.json({ baseUrls: danmuIcuBaseUrls })
  }
)

configRouter.route('/policy', policyRouter)
