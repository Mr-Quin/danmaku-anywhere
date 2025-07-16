import {
  type GenerationConfig,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai'
import { zValidator } from '@hono/zod-validator'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
import { HTTPError } from '@/utils'
import {
  v1GenerationConfig,
  v1Prompt,
  v2GenerationConfig,
  v2Prompt,
} from './prompt'

const extractTitleSchema = z.object({
  input: z
    .string()
    .min(10, 'input is too short')
    .max(4096, 'input is too long'),
})

export const validateTitleInput = zValidator('json', extractTitleSchema)

type ExtractInput<T> = T extends MiddlewareHandler<infer _, infer __, infer I>
  ? I
  : never

export type ExtractTitleInput = ExtractInput<typeof validateTitleInput>

export const useLLMLogger = factory.createMiddleware(async (c, next) => {
  console.log('[LLM Input]', await c.req.text())
  await next()
  if (!c.res || c.res.status !== 200) return
  console.log('[LLM Output]', await c.res.clone().json())
})

const interactWithGemini = async (
  env: Env,
  input: string,
  systemInstruction: string,
  generationConfig: GenerationConfig
) => {
  const apiKey = env.GEMINI_API_KEY
  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction,
  })

  const session = model.startChat({
    generationConfig,
    history: [],
  })

  const result = await session.sendMessage(input)

  return JSON.parse(result.response.text())
}

export const handleExtractTitle = (
  prompt: string,
  config: GenerationConfig
) => {
  return factory.createHandlers<ExtractTitleInput>(async (c) => {
    try {
      const env = c.env
      const { input } = c.req.valid('json')

      const result = await interactWithGemini(env, input, prompt, config)

      return new Response(
        JSON.stringify({
          result,
          success: true,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    } catch (error) {
      if (error instanceof GoogleGenerativeAIFetchError) {
        console.error(`Error from Google Generative AI: ${error.message}`)
        console.error(JSON.stringify(error.errorDetails, null, 2))
        throw new HTTPError(error.status || 500, error.message)
      }
      if (error instanceof Error) {
        throw new HTTPError(500, error.message)
      }

      throw new HTTPError(500, 'Failed to extract title')
    }
  })
}

export const llmLegacy = factory.createApp()
export const llm = factory.createApp()

const useLLMCache = useCache({
  methods: ['POST'],
  maxAge: 60 * 60 * 24,
})

llmLegacy.use('*', useLLMLogger, useLLMCache)
llm.use('*', useLLMLogger, useLLMCache)

llmLegacy.post(
  '/extractTitle',
  validateTitleInput,
  ...handleExtractTitle(v1Prompt, v1GenerationConfig)
)

llm.post(
  '/extractTitle',
  validateTitleInput,
  ...handleExtractTitle(v2Prompt, v2GenerationConfig)
)
