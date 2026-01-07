import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import { extractTitle } from '@danmaku-anywhere/danmaku-provider/genAi'
import { generateText, NoObjectGeneratedError, Output } from 'ai'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { EXTRACT_TITLE_SYSTEM_PROMPT } from '@/common/ai/prompts'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { BUILT_IN_AI_PROVIDER_ID } from '@/common/options/aiProviderConfig/constant'
import type { AiProviderConfigInput } from '@/common/options/aiProviderConfig/schema'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'
import type { MountConfigAiConfig } from '@/common/options/mountConfig/schema'
import type { TestAiProviderResponse } from '@/common/rpcClient/background/types'
import { serializeError } from '@/common/utils/serializeError'
import { tryCatch } from '@/common/utils/tryCatch'
import { invariant } from '@/common/utils/utils'

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
    options: MountConfigAiConfig
  ): Promise<ExtractTitleResponse['result']> {
    const { providerId, maxInputLength, prompt } = options
    this.logger.debug('Extract title', { options })

    const activeProviderId = providerId

    if (activeProviderId === BUILT_IN_AI_PROVIDER_ID) {
      const result = await extractTitle(input)
      if (!result.success) throw result.error
      return result.data
    }

    const providerConfig = await this.aiProviderConfig.mustGet(activeProviderId)

    invariant(
      providerConfig.provider !== 'built-in',
      'Built-in provider does not support openai compatible api'
    )
    invariant(
      providerConfig.enabled,
      `Provider ${activeProviderId} is not enabled`
    )

    const truncatedInput = maxInputLength
      ? input.slice(0, maxInputLength)
      : input

    const openaiCompat = createOpenAICompatible({
      name: providerConfig.name,
      baseURL: providerConfig.settings.baseUrl || '',
      apiKey: providerConfig.settings.apiKey,
      headers: providerConfig.settings.headers,
      queryParams: providerConfig.settings.queryParams,
    })

    const model = openaiCompat(providerConfig.settings.model || 'gpt-3.5-turbo')

    const systemPrompt = EXTRACT_TITLE_SYSTEM_PROMPT

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
      // @ts-expect-error providerOptions is a valid json but we don't have type for it
      providerOptions: providerConfig.settings.providerOptions,
    })

    return {
      isShow: output.isShow,
      title: output.title ?? '',
      episode: output.episode ?? 0,
      episodeTitle: '',
    }
  }

  async testConnection(
    config: AiProviderConfigInput
  ): Promise<TestAiProviderResponse> {
    if (config.provider === 'built-in')
      return {
        state: 'error',
        message: 'Built-in provider does not support connection test',
      }

    const openaiCompat = createOpenAICompatible({
      name: config.name,
      baseURL: config.settings.baseUrl || '',
      apiKey: config.settings.apiKey,
      headers: config.settings.headers,
      queryParams: config.settings.queryParams,
      supportsStructuredOutputs: true,
    })
    const model = openaiCompat(config.settings.model || '')

    const [, err] = await tryCatch(() => {
      return generateText({
        model,
        prompt: 'Reply with json {"success": true}',
        output: Output.object({
          schema: z.object({
            success: z
              .boolean()
              .describe('Whether the connection is successful'),
          }),
        }),
        // @ts-expect-error providerOptions is a valid json but we don't have type for it
        providerOptions: config.settings.providerOptions,
      })
    })

    if (err) {
      this.logger.debug('Connection check failed', err)

      if (NoObjectGeneratedError.isInstance(err)) {
        return {
          state: 'invalid',
          message: err.text ?? err.message,
        }
      }

      return {
        state: 'error',
        message: serializeError(err).message,
      }
    }

    return {
      state: 'success',
    }
  }
}
