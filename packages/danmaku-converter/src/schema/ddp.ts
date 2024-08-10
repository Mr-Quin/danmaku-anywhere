import { z } from 'zod'

export const danDanCommentSchema = z.object({
  /**
   * Comment id
   */
  cid: z.number(),
  /**
   * Comma separated string in format of `time,mode,color,uid`
   * Uid may be a string
   */
  p: z.string(),
  /**
   * Comment text
   */
  m: z.string(),
})

export const danDanCommentResponseSchema = z.object({
  count: z.number(),
  comments: z.array(danDanCommentSchema),
})
