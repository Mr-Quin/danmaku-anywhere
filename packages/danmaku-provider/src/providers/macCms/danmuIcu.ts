import {
  type CommentEntity,
  CommentMode,
  hexToRgb888,
  zHex,
  zTime,
} from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'

export const zDanmuIcuDanmaku = z
  .object({
    code: z.number(),
    name: z.string(),
    danum: z.number(),
    danmuku: z.array(
      z
        .tuple([
          zTime, // time
          z
            .string()
            .transform((mode) => {
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
          z
            .string()
            .default(''), // ?
          z.string(), // text
        ])
        .rest(z.any())
        .transform((data) => {
          const [time, mode, color, , text] = data

          return {
            p: `${time},${mode},${hexToRgb888(color)}`,
            m: text,
          }
        })
    ),
  })
  .transform((data): CommentEntity[] => {
    return data.danmuku.slice(-data.danum)
  })
