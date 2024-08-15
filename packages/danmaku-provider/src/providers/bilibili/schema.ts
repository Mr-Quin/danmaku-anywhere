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
  season_type_name: z.string(),
})

export const bilibiliSearchResponseSchema =
  bilibiliApiResponseBaseSchema.extend({
    data: z
      .object({
        result: z.array(bilibiliSearchMediaSchema).optional().default([]),
      })
      .optional(),
  })

type BilibiliSearchResponse = z.infer<typeof bilibiliSearchResponseSchema>

export type BilibiliSearchResult = NonNullable<
  BilibiliSearchResponse['data']
>['result']

export type BiliBiliSearchType = 'media_ft' | 'media_bangumi'

export interface BiliBiliSearchParams {
  keyword: string
  // searchType: 'media_ft' | 'media_bangumi'
  duration?: number
  order?: 'totalrank' | 'click' | 'pubdate' | 'dm' | 'stow' | 'scores'
  page?: number
}

const bilibiliEpisodeSchema = z.object({
  badge: z.string(),
  aid: z.number(),
  bvid: z.string(),
  cid: z.number(),
  // cover image url
  cover: z.string(),
  // epid
  id: z.number(),
  title: z.string(),
  long_title: z.string(),
  share_copy: z.string(), // title for sharing
})

export const bilibiliBangumiInfoResponseSchema =
  bilibiliApiResponseBaseSchema.extend({
    result: z
      .object({
        episodes: z.array(bilibiliEpisodeSchema).transform((episodes) => {
          return episodes.filter((episode) => {
            // remove trailers
            if (/预告/.test(episode.badge)) return false
            return true
          })
        }),
        title: z.string(),
        type: z.nativeEnum(BiliBiliMediaType),
        media_id: z.number(),
        season_id: z.number(),
      })
      .optional(),
  })

export type BilibiliBangumiInfo = NonNullable<
  z.infer<typeof bilibiliBangumiInfoResponseSchema>['result']
>
