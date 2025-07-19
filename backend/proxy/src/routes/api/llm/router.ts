import { factory } from '@/factory'
import { llm } from './llm'

export const llmRouter = factory.createApp()

llmRouter.route('/v1', llm)
