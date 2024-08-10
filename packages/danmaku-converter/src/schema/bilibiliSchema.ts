import { z } from 'zod'

import { CommentMode } from '../entity/types.js'
import { xmlToJSON } from '../utils/index.js'
import { zRgb888, zTime } from '../validator/index.js'

// Schema based on JSON converted from xml,
// schema may differ depending on the converter used
const bilibiliComment = z
  .object({
    _attributes: z.object({
      p: z
        .string()
        .transform((data) => data.split(','))
        .pipe(
          z
            .tuple([
              // time
              zTime,
              // 	1 2 3：普通弹幕
              // 4：底部弹幕
              // 5：顶部弹幕
              // 6：逆向弹幕
              // 7：高级弹幕
              // 8：代码弹幕
              // 9：BAS弹幕（pool必须为2）
              z.coerce
                .number()
                .int()
                .transform((mode) => {
                  switch (mode) {
                    case 1:
                    case 2:
                    case 3:
                      return CommentMode.rtl
                    case 4:
                      return CommentMode.bottom
                    case 5:
                      return CommentMode.top
                    case 6:
                      return CommentMode.ltr
                    default:
                      return CommentMode.rtl
                  }
                }), // mode
              z.coerce.number().int(), // font size.18 - small, 25 - medium, 36 - large
              zRgb888, // decimal color
              // for compatibility, discard the rest, may include:
              // timestamp, type, sender id, comment id, etc.
            ])
            .rest(z.string())
        ),
    }),
    _text: z.string(),
  })
  .transform((data) => {
    const [time, mode, , color] = data['_attributes'].p

    return {
      p: `${time},${mode},${color}`,
      m: data['_text'],
    }
  })

export const bilibiliCommentSchemaJson = z
  .object({
    i: z.object({
      d: z.array(bilibiliComment),
    }),
  })
  .transform((data) => {
    return {
      comments: data.i.d,
    }
  })

export const bilibiliCommentSchemaXml = z
  .string()
  .transform(async (data) => {
    return xmlToJSON(data)
  })
  .pipe(bilibiliCommentSchemaJson)
