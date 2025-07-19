import { factory } from '@/factory'
import { danDanPlay } from './danDanPlay'

export const ddpRouter = factory.createApp()

ddpRouter.route('/v1', danDanPlay)
