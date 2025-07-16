import { factory } from '@/factory'
import { danDanPlay } from './ddp/danDanPlay'
import { llm } from './llm/llm'
import { repo } from './repo/repo'

export const api = factory.createApp()

api.route('/ddp', danDanPlay)
api.route('/repo', repo)
api.route('/llm', llm)
