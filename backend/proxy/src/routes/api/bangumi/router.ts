import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
import { bangumiProxy } from './bangumi'

export const bangumiRouter = factory.createApp()

bangumiRouter.use('*', useCache({ maxAge: 3600 }))
bangumiRouter.all('/api/:path{.*}', ...bangumiProxy('https://api.bgm.tv'))
bangumiRouter.all('/next/:path{.*}', ...bangumiProxy('https://next.bgm.tv'))
