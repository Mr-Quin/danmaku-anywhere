import { factory } from '@/factory'
import { tagService } from '@/middleware/tagService'
import { authRouter } from './auth/router'
import { backupRouter } from './backup/router'
import { bangumiRouter } from './bangumi/router'
import { configRouter } from './config/router'
import { ddpRouter } from './ddp/router'
import { filesRouter } from './files/router'
import { kazumiRouter } from './kazumi/router'
import { llmRouter } from './llm/router'
import { manifestRouter } from './manifest/router'

export const api = factory.createApp()

api.use(tagService)
api.route('/auth', authRouter)
api.route('/backup', backupRouter)
api.route('/ddp', ddpRouter)
api.route('/bangumi', bangumiRouter)
api.route('/llm', llmRouter)
api.route('/kazumi', kazumiRouter)
api.route('/manifest', manifestRouter)
api.route('/config', configRouter)
api.route('/files', filesRouter)
