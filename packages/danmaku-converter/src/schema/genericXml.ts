import { z } from 'zod'
import { type CommentEntity, CommentMode } from '../canonical/index.js'
import { xmlToJSON, zRgb888, zTime } from '../utils/index.js'

// Schema based on JSON converted from xml,
// schema may differ depending on the converter used
const zXmlParsedEntry = z
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
                      return null
                  }
                }), // mode
              z.coerce
                .number()
                .int(), // font size.18 - small, 25 - medium, 36 - large
              zRgb888, // decimal color
              // for compatibility, discard the rest, may include:
              // timestamp, type, sender id, comment id, etc.
            ])
            .rest(z.string())
        ),
      s: z.string().optional(),
    }),
    _text: z.string().optional().default(''),
  })
  .transform((data) => {
    // drop font size
    const [time, mode, , color] = data['_attributes'].p

    // discard other modes
    if (mode === null) return null

    return {
      p: `${time},${mode},${color}`,
      m: data['_text'],
      s: data['_attributes'].s,
    }
  })

export const zXmlParsedJson = z
  .object({
    i: z.object({
      d: z.array(zXmlParsedEntry).transform((comments) =>
        comments.filter(
          (
            comment
          ): comment is { p: string; m: string; s: string | undefined } => {
            if (comment === null) return false
            return comment.m !== ''
          }
        )
      ),
    }),
  })
  .transform((data): CommentEntity[] => {
    return data.i.d
  })

export const zGenericXml = z
  .string()
  .transform(async (data) => {
    return xmlToJSON(data)
  })
  .pipe(zXmlParsedJson)
