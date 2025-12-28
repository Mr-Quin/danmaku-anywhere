import { createOpenAI } from '@ai-sdk/openai'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import { extractTitle } from '@danmaku-anywhere/danmaku-provider/genAi'
import { generateObject } from 'ai'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { BUILT_IN_AI_PROVIDER_ID } from '@/common/options/aiProviderConfig/constant'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'

@injectable('Singleton')
export class GenAIService {
  private logger: ILogger

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @inject(AiProviderConfigService)
    public readonly aiProviderConfig: AiProviderConfigService
  ) {
    this.logger = logger.sub('[GenAIService]')
  }

  async extractTitle(
    input: string,
    options?: {
      providerId?: string
      maxInputLength?: number
      prompt?: string
    }
  ): Promise<ExtractTitleResponse['result']> {
    const { providerId, maxInputLength, prompt } = options || {}
    this.logger.debug('Extract title', { options })

    const activeProviderId = providerId || BUILT_IN_AI_PROVIDER_ID

    if (activeProviderId === BUILT_IN_AI_PROVIDER_ID) {
      const result = await extractTitle(input)
      if (!result.success) throw result.error
      return result.data
    }

    const providerConfig = await this.aiProviderConfig.get(activeProviderId)
    if (!providerConfig || !providerConfig.enabled) {
      throw new Error(`Provider ${activeProviderId} is not available`)
    }

    const truncatedInput = maxInputLength
      ? input.slice(0, maxInputLength)
      : input

    try {
      const openai = createOpenAI({
        baseURL: providerConfig.settings.baseUrl,
        apiKey: providerConfig.settings.apiKey,
      })

      const model = openai(providerConfig.settings.model || 'gpt-3.5-turbo')

      const systemPrompt = `You are a helpful assistant that extracts show title and episode number from user provided website title/content.
The user will provide a text, you need to extract the show title and episode number from it.

Rules:
1. If the input contains a show title, return it in the "title" field.
2. If the input contains an episode number, return it in the "episode" field.
3. If the input does not look like a show page (e.g. home page, list page), set "isShow" to false.

Return a JSON object with the following structure:
{
  "isShow": boolean,
  "title": string | null,
  "episode": string | null
}
`
      const userInstruction = prompt
        ? `\n\nAdditional Instructions:\n${prompt}`
        : ''

      const { object } = await generateObject({
        model,
        schema: z.object({
          isShow: z.boolean(),
          title: z.string().nullable(),
          episode: z.preprocess((val) => Number(val), z.number()).nullable(),
        }),
        messages: [
          { role: 'system', content: systemPrompt + userInstruction },
          { role: 'user', content: truncatedInput },
        ],
      })

      return {
        isShow: object.isShow,
        title: object.title ?? '',
        episode: object.episode ?? 0,
        episodeTitle: '',
        altTitles: [],
      }
    } catch (e) {
      this.logger.error('Failed to extract title using custom provider', e)
      throw e
    }
  }
}
