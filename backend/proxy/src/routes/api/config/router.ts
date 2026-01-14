import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
import { policyRouter } from './policy'
import { danmuIcuBaseUrls } from './urls/danmuicu'
import { macCmsBaseUrls } from './urls/maccms'

export const configRouter = factory.createApp()

configRouter.get(
  '/maccms',
  useCache({
    maxAge: 60 * 60 * 24,
  }),
  (c) => {
    return c.json({ baseUrls: macCmsBaseUrls })
  }
)

configRouter.get(
  '/danmuicu',
  useCache({
    maxAge: 60 * 60 * 24,
  }),
  (c) => {
    return c.json({ baseUrls: danmuIcuBaseUrls })
  }
)

configRouter.route('/policy', policyRouter)
