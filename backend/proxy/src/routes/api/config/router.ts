import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
import { danmuIcuBaseUrls } from './urls/danmuicu'
import { macCmsBaseUrls } from './urls/maccms'

export const configRouter = factory.createApp()

configRouter.use(
  '*',
  useCache({
    maxAge: 60 * 60 * 24,
  })
)

configRouter.get('/maccms', (c) => {
  const baseUrls = macCmsBaseUrls
  return c.json({ baseUrls })
})

configRouter.get('/danmuicu', (c) => {
  const baseUrls = danmuIcuBaseUrls
  return c.json({ baseUrls })
})
