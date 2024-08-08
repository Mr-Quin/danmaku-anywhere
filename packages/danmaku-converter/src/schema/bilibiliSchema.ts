import { DanDanCommentMode } from '@danmaku-anywhere/dandanplay-api'
import { z } from 'zod'

// 	1 2 3：普通弹幕
// 4：底部弹幕
// 5：顶部弹幕
// 6：逆向弹幕
// 7：高级弹幕
// 8：代码弹幕
// 9：BAS弹幕（pool必须为2）

export const bilibiliSchema = z
  .object({
    i: z.object({
      d: z.array(
        z
          .object({
            '-p': z
              .string()
              .transform((data) => data.split(','))
              .pipe(
                z
                  .tuple([
                    z.coerce.number(), // time
                    z.coerce
                      .number()
                      .int()
                      .refine((mode) => {
                        switch (mode) {
                          case 1:
                          case 2:
                          case 3:
                            return DanDanCommentMode.rtl
                          case 4:
                            return DanDanCommentMode.bottom
                          case 5:
                            return DanDanCommentMode.top
                          case 6:
                            return DanDanCommentMode.ltr
                          default:
                            return DanDanCommentMode.rtl
                        }
                      }), // mode
                    z.coerce.number().int(), // font size.18 - small, 25 - medium, 36 - large
                    z.coerce.number().int().max(16777215).min(0), // decimal color
                    // for compatibility, discard the rest, may include:
                    // timestamp, type, sender id, comment id, etc.
                  ])
                  .rest(z.string())
              ),
            '-text': z.string(),
          })
          .transform((data) => {
            const [time, mode, color] = data['-p']

            return {
              p: `${time},${mode},${color}`,
              m: data['-text'],
            }
          })
      ),
    }),
  })
  .transform((data) => {
    return {
      comments: data.i.d,
    }
  })
