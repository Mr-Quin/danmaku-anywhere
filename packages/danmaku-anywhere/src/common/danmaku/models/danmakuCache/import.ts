import { zRgb888, zTime } from '@danmaku-anywhere/danmaku-converter'
import {
  DanDanChConvert,
  DanDanCommentMode,
} from '@danmaku-anywhere/danmaku-provider'
import { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'

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
            z.coerce.number().pipe(z.nativeEnum(DanDanCommentMode)),
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

// Handles importing danmaku that are exported from the extension
// The schema should satisfy DanmakuCache
const DDPDanmakuCacheSchemaOne = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(DanmakuSourceType.DDP),
    comments: z.array(importCommentSchema),
    version: z.number(),
    timeUpdated: z.number(),
    params: z.object({
      chConvert: z.nativeEnum(DanDanChConvert).optional(),
      withRelated: z.boolean().optional(),
      from: z.number().optional(),
    }),
    meta: z.object({
      type: z.literal(DanmakuSourceType.DDP),
      episodeId: z.number(),
      animeId: z.number(),
      episodeTitle: z.string().optional(),
      animeTitle: z.string(),
    }),
  }),
])

const customDanmakuCacheSchemaOne = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(DanmakuSourceType.Custom),
    comments: z.array(importCommentSchema),
    version: z.number(),
    timeUpdated: z.number(),
    meta: z
      .object({
        type: z.literal(DanmakuSourceType.Custom),
        animeTitle: z.string(),
        episodeTitle: z.string().optional(),
        episodeNumber: z.number().optional(),
      })
      .refine((data) => {
        return (
          data.episodeTitle !== undefined || data.episodeNumber !== undefined
        )
      }, 'One of episodeTitle or episodeNumber is required'),
  }),
])

export const importDanmakuSchema = z.array(
  z.discriminatedUnion('type', [
    ...DDPDanmakuCacheSchemaOne.options,
    ...customDanmakuCacheSchemaOne.options,
  ])
)
