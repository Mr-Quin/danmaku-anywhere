import { factory } from '@/factory'
import { ddpRouter } from './ddp/router'
import { llmRouter } from './llm/router'
import { repoRouter } from './repo/router'

export const api = factory.createApp()

api.route('/ddp', ddpRouter)
api.route('/llm', llmRouter)
api.route('/repo', repoRouter)
