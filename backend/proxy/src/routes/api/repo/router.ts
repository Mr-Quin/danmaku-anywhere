import { factory } from '@/factory'
import { repo } from './repo'

export const repoRouter = factory.createApp()

repoRouter.route('/v1', repo)
