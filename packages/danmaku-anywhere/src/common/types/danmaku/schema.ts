import { DanDanCommentMode } from '@danmaku-anywhere/dandanplay-api'
import { encodeColor } from '@danmaku-anywhere/danmaku-engine'
import { z } from 'zod'

export const commentSchema = z
  .object({
    mode: z
      .union(
        [
          z.literal('ltr'),
          z.literal('rtl'),
          z.literal('top'),
          z.literal('bottom'),
        ],
        {
          invalid_type_error: 'Mode must be one of ltr, rtl, top, bottom',
        }
      )
      .optional()
      .default('rtl'),
    time: z.number(), // in seconds, float
    color: z.string().refine((data) => {
      return /^#[0-9A-F]{6}$/i.test(data)
    }, 'Invalid hex color'), // hex color
    text: z.string(),
    user: z.string().optional(),
  })
  .strict()
  .transform((data) => {
    return {
      p: `${data.time},${DanDanCommentMode[data.mode]},${encodeColor(data.color)}`,
      m: data.text,
    }
  })

export const customDanmakuCreateSchema = z
  .object({
    comments: z
      .array(commentSchema)
      .nonempty({ message: 'At least one comment is required' }),
    animeTitle: z.string(),
    episodeTitle: z.string().optional(),
    episodeNumber: z.number().optional(),
  })
  .strict()
  .refine((data) => {
    return data.episodeTitle !== undefined || data.episodeNumber !== undefined
  }, 'One of episodeTitle or episodeNumber is required')
