import { factory } from '@/factory'
import { tagService } from '@/middleware/tagService'
import { ddpRouter } from './ddp/router'
import { kazumiRouter } from './kazumi/router'
import { llmRouter } from './llm/router'

export const api = factory.createApp()

api.use(tagService)
api.route('/ddp', ddpRouter)
api.route('/llm', llmRouter)
api.route('/kazumi', kazumiRouter)
