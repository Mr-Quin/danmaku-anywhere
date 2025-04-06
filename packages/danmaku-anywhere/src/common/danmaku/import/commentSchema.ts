import {
  CommentMode,
  zRgb888,
  zTime,
} from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'

export const importCommentSchema = z
  .object({
    p: z
      .string()
      .transform((data) => {
        return data.split(',')
      })
      .pipe(
        z
          .tuple([
            zTime, // time
            z.coerce.number().pipe(z.nativeEnum(CommentMode)),
            zRgb888, // decimal color
          ])
          .rest(z.string())
      ),
    m: z.string(),
    cid: z.number().optional(),
  })
  .transform(({ p: pTuple, m, cid }) => {
    const [time, mode, color, uid] = pTuple

    const p =
      uid === undefined
        ? `${time},${mode},${color}`
        : `${time},${mode},${color},${uid}`

    if (cid === undefined) {
      return {
        p,
        m,
      }
    }
    return {
      p,
      m,
      cid,
    }
  })
