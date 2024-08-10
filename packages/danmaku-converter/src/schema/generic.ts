import { z } from 'zod'

import { CommentMode } from '../entity/types.js'
import { hexToRgb888 } from '../utils/index.js'
import { zHex, zTime } from '../validator/index.js'

export const wevipDanmakuSchema = z
  .object({
    danmuku: z.array(
      z
        .tuple([
          zTime, // time
          z.string().refine((mode) => {
            switch (mode) {
              case 'top':
                return CommentMode.top
              case 'bottom':
                return CommentMode.bottom
              default:
                return CommentMode.rtl
            }
          }), // mode
          zHex, // color
          z.string(), // ?
          z.string(), // text
          z.string(), // ip
          z.string(), // ?
          z.string(), // font size
        ])
        .transform((data) => {
          const [time, mode, color, , text] = data

          return {
            p: `${time},${mode},${hexToRgb888(color)}`,
            m: text,
          }
        })
    ),
  })
  .transform((data) => {
    return {
      comments: data.danmuku,
    }
  })
