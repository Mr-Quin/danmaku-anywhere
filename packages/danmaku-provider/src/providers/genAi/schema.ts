import { z } from 'zod'

const zGeminiSuccessResponse = z.object({
  success: z.literal(true),
})

const zGeminiErrorResponse = z.object({
  success: z.literal(false),
  message: z.string(),
})

export const zExtractTitleSuccessResponse = zGeminiSuccessResponse.extend({
  success: z.literal(true),
  result: z.object({
    title: z.string(),
    episode: z.number(),
    season: z.string().optional(),
    episodeTitle: z.string().optional(),
    altTitles: z.array(z.string()).optional(),
  }),
})

export const zExtractTitleResponse = z.discriminatedUnion('success', [
  zExtractTitleSuccessResponse,
  zGeminiErrorResponse,
])

export type ExtractTitleResponse = z.infer<typeof zExtractTitleSuccessResponse>
