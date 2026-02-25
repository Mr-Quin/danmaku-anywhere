import { factory } from '@/factory'
import { llm } from './routes'

export const llmRouter = factory.createApp()

llmRouter.route('/v1', llm)
