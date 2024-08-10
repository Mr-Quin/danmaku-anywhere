import { hexToRgb888 } from '@danmaku-anywhere/danmaku-provider'
import { DanDanCommentMode } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { zHex, zTime } from '../validator/index.js'

export const wevipSchema = z
  .object({
    danmuku: z.array(
      z
        .tuple([
          zTime, // time
          z.string().refine((mode) => {
            switch (mode) {
              case 'top':
                return DanDanCommentMode.top
              case 'bottom':
                return DanDanCommentMode.bottom
              default:
                return DanDanCommentMode.rtl
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
