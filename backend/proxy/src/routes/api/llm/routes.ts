import { describeRoute, resolver } from 'hono-openapi'
import { z } from 'zod'
import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
import { useGeminiErrorHandler } from '@/routes/api/llm/middleware/geminiErrorHandler'
import { useLLMLogger } from '@/routes/api/llm/middleware/llmLogger'
import {
  handleExtractTitle,
  handleExtractTitleLegacy,
  validateTitleInputOpenApi,
} from './llm.controller'
import {
  v1GenerationConfig,
  v1Prompt,
  v2GenerationConfig,
  v2Prompt,
} from './prompt'

const useLLMCache = useCache({
  methods: ['POST'],
  maxAge: 60 * 60 * 24,
})

export const llmLegacy = factory.createApp()
export const llm = factory.createApp()

llmLegacy.use('*', useLLMLogger, useLLMCache, useGeminiErrorHandler())
llm.use('*', useLLMLogger, useLLMCache, useGeminiErrorHandler())

llmLegacy.post(
  '/extractTitle',
  handleExtractTitleLegacy(v1Prompt, v1GenerationConfig)
)

llm.post(
  '/extractTitle',
  describeRoute({
    description: 'Extract title from input using LLM',
    responses: {
      200: {
        description: 'Successful extraction',
        content: {
          'application/json': {
            schema: resolver(
              z.object({
                success: z.boolean(),
                result: z.object({
                  isShow: z.boolean(),
                  title: z.string(),
                  episode: z.number(),
                  episodeTitle: z.string(),
                }),
              })
            ),
          },
        },
      },
      429: {
        description: 'Rate limit exceeded',
      },
    },
  }),
  validateTitleInputOpenApi,
  handleExtractTitle(v2Prompt, v2GenerationConfig)
)
