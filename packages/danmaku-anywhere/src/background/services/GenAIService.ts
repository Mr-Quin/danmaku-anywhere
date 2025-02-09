import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import {
  configure,
  extractTitle,
} from '@danmaku-anywhere/danmaku-provider/genAi'

import { Logger } from '@/common/Logger'

if (import.meta.env.DEV) {
  configure({
    baseUrl: 'http://127.0.0.1:8787',
  })
} else {
  configure({
    baseUrl: import.meta.env.VITE_PROXY_URL,
  })
}

export class GenAIService {
  private logger: typeof Logger

  constructor() {
    this.logger = Logger.sub('[GenAIService]')
  }

  async extractTitle(input: string): Promise<ExtractTitleResponse['result']> {
    this.logger.debug('Extract title')

    const res = await extractTitle(input)
    return res
  }
}
