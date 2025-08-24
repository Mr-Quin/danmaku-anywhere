import {
  type GenerationConfig,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai'
import { zValidator } from '@hono/zod-validator'
import * as Sentry from '@sentry/cloudflare'
import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { factory } from '@/factory'
import { useCache } from '@/middleware/cache'
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
  const input = await c.req.text()
  console.log('[LLM Input]', input)
  Sentry.addBreadcrumb({
    category: 'llm.input',
    message: 'Received LLM input',
    data: { input },
  })
  await next()
  if (!c.res || c.res.status !== 200) {
    return
  }
  const output = await c.res.clone().json()
  console.log('[LLM Output]', output)
  Sentry.addBreadcrumb({
    category: 'llm.output',
    message: 'Send LLM output',
    data: { output },
  })
})

const interactWithGemini = async (
  env: Env,
  input: string,
  systemInstruction: string,
  generationConfig: GenerationConfig
) => {
  const GEMINI_API_KEY = await env.DANMAKU_GEMINI_API_KEY.get()
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

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
        console.error('Error from Google Generative AI:')
        console.error(error.message)
        console.error(JSON.stringify(error.errorDetails, null, 2))
        if (error.status === 429) {
          console.error('Rate limit exceeded')
          throw new HTTPException(429, {
            message: 'Rate limit exceeded, please try again later.',
          })
        }
        throw new HTTPException(500, { message: 'Failed to extract title' })
      }
      if (error instanceof Error) {
        throw new HTTPException(500, { message: error.message })
      }

      throw new HTTPException(500, { message: 'Failed to extract title' })
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
