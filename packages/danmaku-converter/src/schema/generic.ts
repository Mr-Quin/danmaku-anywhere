import { encodeColor } from '@danmaku-anywhere/danmaku-engine'
import { DanDanCommentMode } from '@danmaku-anywhere/danmaku-provider'
import { z } from 'zod'

import { zHex, zTime } from '../validator'

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
          const [time, mode, color, _, text] = data

          return {
            p: `${time},${mode},${encodeColor(color)}`,
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
