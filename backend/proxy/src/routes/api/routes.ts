import { factory } from '@/factory'
import { tagService } from '@/middleware/tagService'
import { authRouter } from './auth/router'
import { configRouter } from './config/router'
import { ddpRouter } from './ddp/router'
import { filesRouter } from './files/router'
import { kazumiRouter } from './kazumi/router'
import { llmRouter } from './llm/router'

export const api = factory.createApp()

api.use(tagService)
api.route('/auth', authRouter)
api.route('/ddp', ddpRouter)
api.route('/llm', llmRouter)
api.route('/kazumi', kazumiRouter)
api.route('/config', configRouter)
api.route('/files', filesRouter)
