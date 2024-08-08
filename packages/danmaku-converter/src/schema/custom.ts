import { DanDanCommentMode } from '@danmaku-anywhere/dandanplay-api'
import { encodeColor } from '@danmaku-anywhere/danmaku-engine'
import { z } from 'zod'

import { zHex, zTime } from '../validator'

export const customCommentSchema = z
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
    time: zTime, // in seconds, float
    color: zHex,
    text: z.string(),
    user: z.string().optional(),
  })
  .transform((data) => {
    return {
      p: `${data.time},${DanDanCommentMode[data.mode]},${encodeColor(data.color)}`,
      m: data.text,
    }
  })

export const customDanmakuSchema = z
  .object({
    comments: z.array(customCommentSchema),
    animeTitle: z.string(),
    episodeTitle: z.string().optional(),
    episodeNumber: z.number().optional(),
  })
  .refine(
    (data) => {
      return !(
        data.episodeTitle === undefined && data.episodeNumber === undefined
      )
    },
    { message: 'Either episodeTitle or episodeNumber must be provided' }
  )
