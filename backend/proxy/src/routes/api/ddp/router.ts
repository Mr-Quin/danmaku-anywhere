import { factory } from '@/factory'
import { danDanPlay } from './danDanPlay'
import { ddpTransparent } from './transparent'

export const ddpRouter = factory.createApp()

ddpRouter.route('/v1', danDanPlay)
ddpRouter.route('/api', ddpTransparent)
