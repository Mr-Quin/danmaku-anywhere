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
    code: z.number().optional(),
    name: z.string().optional(),
    danum: z.number().optional(),
    danmuku: z.array(
      z
        .tuple([
          zTime, // time
          z
            .string()
            .refine((mode) => {
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
            .optional()
            .default(''), // ?
          z.string(), // text
          z
            .string()
            .optional()
            .default(''), // ip
          z
            .string()
            .optional()
            .default(''), // ?
          z
            .string()
            .optional()
            .default(''), // font size
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
  .transform((data): CommentEntity[] => {
    return data.danmuku
  })
