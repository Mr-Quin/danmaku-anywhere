import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import { extractTitle } from '@danmaku-anywhere/danmaku-provider/genAi'
import { injectable } from 'inversify'
import { Logger } from '@/background/backgroundLogger'
import type { ILogger } from '@/common/Logger'

@injectable('Singleton')
export class GenAIService {
  private logger: ILogger

  constructor() {
    this.logger = Logger.sub('[GenAIService]')
  }

  async extractTitle(input: string): Promise<ExtractTitleResponse['result']> {
    this.logger.debug('Extract title')

    const res = await extractTitle(input)
    return res
  }
}
