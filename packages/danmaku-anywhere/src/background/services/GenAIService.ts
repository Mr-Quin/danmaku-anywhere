import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import { extractTitle } from '@danmaku-anywhere/danmaku-provider/genAi'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'

@injectable('Singleton')
export class GenAIService {
  private logger: ILogger

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[GenAIService]')
  }

  async extractTitle(input: string): Promise<ExtractTitleResponse['result']> {
    this.logger.debug('Extract title')

    const result = await extractTitle(input)
    if (!result.success) throw result.error
    return result.data
  }
}
