import { z } from 'zod'
import { CommentMode } from '../canonical/comment/types.js'
import { zRgb888, zTime } from '../utils/index.js'
import { zXmlParsedJson } from './genericXml.js'
import { zWevipDanmaku } from './weVip.js'

export * from './genericXml.js'

// Like canonical zCommentImport but also preserves the optional gradient
// `s` field that `CommentEntity` allows. Used for top-level arrays of
// already-canonical comments (e.g. decoded Bilibili protobuf).
const zCommentEntityImport = z
  .object({
    p: z
      .string()
      .transform((data) => data.split(',') as unknown[])
      .pipe(
        z
          .tuple([
            zTime,
            z.coerce.number<string>().pipe(z.enum(CommentMode)),
            zRgb888,
          ])
          .rest(z.string())
      ),
    m: z.string(),
    cid: z.number().optional(),
    s: z.string().optional(),
  })
  .transform(({ p: pTuple, m, cid, s }) => {
    const [time, mode, color, uid] = pTuple
    const p =
      uid === undefined
        ? `${time},${mode},${color}`
        : `${time},${mode},${color},${uid}`
    const out: { p: string; m: string; cid?: number; s?: string } = { p, m }
    if (cid !== undefined) {
      out.cid = cid
    }
    if (s !== undefined) {
      out.s = s
    }
    return out
  })

export const zCombinedDanmaku = z.union([
  zXmlParsedJson,
  zWevipDanmaku,
  z.array(zCommentEntityImport),
])
