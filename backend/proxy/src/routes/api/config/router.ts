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
  return c.json({ baseUrls: macCmsBaseUrls })
})

configRouter.get('/danmuicu', (c) => {
  return c.json({ baseUrls: danmuIcuBaseUrls })
})
