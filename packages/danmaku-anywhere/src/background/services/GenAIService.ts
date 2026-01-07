import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import { extractTitle } from '@danmaku-anywhere/danmaku-provider/genAi'
import { generateText, NoObjectGeneratedError, Output } from 'ai'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { BUILT_IN_AI_PROVIDER_ID } from '@/common/options/aiProviderConfig/constant'
import {
  type AiProviderConfig,
  AiProviderType,
} from '@/common/options/aiProviderConfig/schema'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'
import { tryCatch } from '@/common/utils/tryCatch'

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
      const openai = createOpenAICompatible({
        name: providerConfig.name,
        baseURL: providerConfig.settings.baseUrl || '',
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

      const { output } = await generateText({
        model,
        system: systemPrompt + userInstruction,
        prompt: truncatedInput,
        output: Output.object({
          schema: z.object({
            isShow: z.boolean().describe('Whether the input is a show page'),
            title: z.string().nullable().describe("Show's title"),
            episode: z
              .preprocess((val) => Number(val), z.number())
              .nullable()
              .describe('Episode number'),
          }),
        }),
      })

      return {
        isShow: output.isShow,
        title: output.title ?? '',
        episode: output.episode ?? 0,
        episodeTitle: '',
      }
    } catch (e) {
      this.logger.error('Failed to extract title using custom provider', e)
      throw e
    }
  }
  async testConnection(config: AiProviderConfig): Promise<boolean> {
    if (config.provider === AiProviderType.BuiltIn) return true

    const openai = createOpenAICompatible({
      name: config.name,
      baseURL: config.settings.baseUrl || '',
      apiKey: config.settings.apiKey,
      supportsStructuredOutputs: true,
    })
    const model = openai(config.settings.model || 'gpt-3.5-turbo')

    const [res, err] = await tryCatch(() => {
      return generateText({
        model,
        prompt: "What's your name?",
        output: Output.object({
          schema: z.object({
            name: z.string().describe('Your name'),
          }),
        }),
      })
    })

    if (err) {
      this.logger.error('Connection check failed', err)
      if (NoObjectGeneratedError.isInstance(err)) {
        console.log('NoObjectGeneratederr')
        console.log('Cause:', err.cause)
        console.log('Text:', err.text)
        console.log('Response:', err.response)
        console.log('Usage:', err.usage)
      }
      return false
    }

    const { text, output } = res

    console.log(output, text)
    return true
  }
}
