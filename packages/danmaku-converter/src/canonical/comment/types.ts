import { z } from 'zod'
import { zRgb888, zTime } from '../../utils/index.js'

export enum CommentMode {
  ltr = 6,
  rtl = 1,
  top = 5,
  bottom = 4,
}

export const zCommentEntity = z.object({
  /**
   * Comment id, if available
   */
  cid: z.number().optional(),
  /**
   * Comma separated string in format of `time,mode,color,uid`
   * Uid may be a string
   * Uid may not be provided
   */
  p: z.string(),
  /**
   * Comment text
   */
  m: z.string(),
})

export type CommentEntity = z.infer<typeof zCommentEntity>

export interface CommentOptions {
  time: number
  mode: keyof typeof CommentMode
  color: string
  uid?: string
}

export const zCommentImport = z
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
