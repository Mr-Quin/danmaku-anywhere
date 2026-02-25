import type { GenerationConfig } from '@google/generative-ai'
import type { Context } from 'hono'
import { validator } from 'hono-openapi'
import { z } from 'zod'
import { extractTitleWithGemini } from './llm.service'

const extractTitleSchema = z.object({
  input: z
    .string()
    .min(10, 'input is too short')
    .max(4096, 'input is too long'),
})

export const validateTitleInputOpenApi = validator('json', extractTitleSchema)

type ExtractTitleValidated = z.infer<typeof extractTitleSchema>

export function handleExtractTitle(prompt: string, config: GenerationConfig) {
  return async (c: Context<{ Bindings: Env }>) => {
    const { input } = c.req.valid('json' as never) as ExtractTitleValidated
    const result = await extractTitleWithGemini({
      env: c.env,
      input,
      systemInstruction: prompt,
      generationConfig: config,
    })
    return c.json({ result, success: true }, 200)
  }
}

export function handleExtractTitleLegacy(
  prompt: string,
  config: GenerationConfig
) {
  return async (c: Context<{ Bindings: Env }>) => {
    const { input } = await c.req.json<{ input: string }>()
    const result = await extractTitleWithGemini({
      env: c.env,
      input,
      systemInstruction: prompt,
      generationConfig: config,
    })
    return c.json({ result, success: true }, 200)
  }
}
