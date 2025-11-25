import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import { extractTitle } from '@danmaku-anywhere/danmaku-provider/genAi'
import { injectable } from 'inversify'
import { Logger } from '@/common/Logger'

@injectable()
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
