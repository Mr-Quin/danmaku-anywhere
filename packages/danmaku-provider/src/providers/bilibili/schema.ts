import { z } from 'zod'

import { BiliBiliMediaType } from './enums.js'

const bilibiliApiResponseBaseSchema = z.object({
  code: z.number(),
  message: z.string(),
})

export type BilibiliApiResponseBase = z.infer<
  typeof bilibiliApiResponseBaseSchema
>

const bilibiliSearchMediaSchema = z.object({
  type: z.enum(['media_ft', 'media_bangumi']),
  media_id: z.number(), // mdid
  season_id: z.number(), // ssid
  title: z.string(),
  media_type: z.nativeEnum(BiliBiliMediaType),
  cover: z.string(),
})

export const bilibiliSearchResponseSchema =
  bilibiliApiResponseBaseSchema.extend({
    data: z
      .object({
        result: z.array(bilibiliSearchMediaSchema).optional().default([]),
      })
      .optional(),
  })

export type BiliBiliSearchType = 'media_ft' | 'media_bangumi'

export interface BiliBiliSearchParams {
  keyword: string
  // searchType: 'media_ft' | 'media_bangumi'
  duration?: number
  order?: 'totalrank' | 'click' | 'pubdate' | 'dm' | 'stow' | 'scores'
  page?: number
}

const bilibiliEpisodeSchema = z.object({
  aid: z.number(),
  bvid: z.string(),
  cid: z.number(),
  // cover image url
  cover: z.string(),
  // epid
  id: z.number(),
  title: z.string(),
})

export const bilibiliBangumiInfoResponseSchema =
  bilibiliApiResponseBaseSchema.extend({
    result: z
      .object({
        episodes: z.array(bilibiliEpisodeSchema),
        title: z.string(),
        type: z.nativeEnum(BiliBiliMediaType),
      })
      .optional(),
  })
