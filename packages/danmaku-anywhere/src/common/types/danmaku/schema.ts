import { z } from 'zod'

export const commentSchema = z.object({
  mode: z
    .union([
      z.literal('ltr'),
      z.literal('rtl'),
      z.literal('top'),
      z.literal('bottom'),
    ])
    .default('rtl'),
  time: z.number(),
  color: z.number(),
  text: z.string(),
  user: z.string().optional(),
})

export const manualDanmakuCreateSchema = z
  .object({
    comments: z.array(commentSchema),
    animeTitle: z.string(),
    episodeTitle: z.string().optional(),
    episodeNumber: z.number().optional(),
  })
  .refine((data) => {
    return data.episodeTitle !== undefined || data.episodeNumber !== undefined
  }, 'One of episodeTitle or episodeNumber is required')
