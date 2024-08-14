import { z } from 'zod'

import { CommentMode } from '../entity/types.js'
import { hexToRgb888 } from '../utils/index.js'
import { zHex, zTime } from '../validator/index.js'

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
      p: `${data.time},${CommentMode[data.mode]},${hexToRgb888(data.color)}`,
      m: data.text,
    }
  })

export const customDanmakuSchema = z.object({
  comments: z.array(customCommentSchema),
  seasonTitle: z.string(),
  episodeTitle: z.string(),
})
