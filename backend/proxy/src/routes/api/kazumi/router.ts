import { factory } from '@/factory'
import { rulesRouter } from './rules'

export const kazumiRouter = factory.createApp()

kazumiRouter.route('/rules', rulesRouter)