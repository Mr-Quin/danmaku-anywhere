import { z } from 'zod'
import { rgb888ToHex, zRgb888, zTime } from '../../utils/index.js'

export enum CommentMode {
  ltr = 6,
  rtl = 1,
  top = 5,
  bottom = 4,
}

// Modes 1/2/3 are all right-to-left scrolling variants per the danmaku spec; normalize to mode 1.
export function normalizeCommentMode(n: number): number {
  if (n === 2 || n === 3) {
    return 1
  }
  return n
}

export interface CommentOptions {
  time: number
  mode: keyof typeof CommentMode
  color: string
  uid?: string
}

// returns null when the renderer cannot place the comment, so callers can drop it instead of throwing
export function parseCommentEntityP(p: string): CommentOptions | null {
  const [time, mode, color, uid = ''] = p.split(',')
  const timeNum = Number.parseFloat(time)
  const modeNum = normalizeCommentMode(Number.parseInt(mode))

  if (!Number.isFinite(timeNum) || !CommentMode[modeNum]) {
    return null
  }

  return {
    time: timeNum,
    mode: CommentMode[modeNum] as keyof typeof CommentMode,
    color: rgb888ToHex(Number.parseInt(color)),
    uid,
  }
}

// Stored episodes and backups can hold comments the renderer skips (bilibili's
// positioned mode 7, for one), and restoring a backup must not reject a whole
// episode over them.
export const zStoredCommentEntity = z.object({
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
  /**
   * Gradient
   */
  s: z.string().optional(),
})

export const zCommentEntity = zStoredCommentEntity.extend({
  p: z.string().refine((p) => parseCommentEntityP(p) !== null, {
    message: 'Comment options are not renderable',
  }),
})

export type CommentEntity = z.infer<typeof zCommentEntity>

export const zCommentImport = z
  .object({
    p: z
      .string()
      .transform((data) => {
        return data.split(',') as unknown[]
      })
      .pipe(
        z
          .tuple([
            zTime, // time
            z.coerce
              .number<string>()
              .transform(normalizeCommentMode)
              .pipe(z.enum(CommentMode)),
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
