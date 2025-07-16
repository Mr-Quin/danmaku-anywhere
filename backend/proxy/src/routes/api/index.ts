import { factory } from '@/factory'
import { useCache } from '@/middleware'
import { danDanPlay } from './ddp/danDanPlay'
import { llm } from './llm/llm'
import { repo } from './repo/repo'

export * from './ddp/danDanPlay'
export * from './llm/llm'
export * from './repo/repo'

export const api = factory.createApp()

api.use('/ddp/*', useCache())

api.route('/ddp', danDanPlay)
api.route('/repo', repo)
api.route('/llm', llm)
