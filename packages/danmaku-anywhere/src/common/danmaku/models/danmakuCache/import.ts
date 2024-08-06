import { DanDanChConvert } from '@danmaku-anywhere/dandanplay-api'
import { parseDanDanCommentParams } from '@danmaku-anywhere/danmaku-engine'
import { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'

export const importCommentSchema = z.object({
  p: z.string().refine((data) => {
    const { time, color } = parseDanDanCommentParams(data)
    return time >= 0 && /^#[0-9A-F]{6}$/i.test(color)
  }),
  m: z.string(),
  cid: z.number().optional(),
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
