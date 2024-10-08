import { z } from 'zod'

import type { DanDanChConvert } from './enums.js'

const danDanEpisodeSchema = z.object({
  episodeId: z.number(),
  episodeTitle: z.string(),
})

export type DanDanEpisode = z.infer<typeof danDanEpisodeSchema>

export const danDanAnimeTypeSchema = z.string()

export type DanDanAnimeType = z.infer<typeof danDanAnimeTypeSchema>

export const danDanAnimeSchema = z.object({
  animeId: z.number(),
  animeTitle: z.string(),
  type: danDanAnimeTypeSchema,
  typeDescription: z.string(),
  episodes: z.array(danDanEpisodeSchema),
})

export type DanDanAnime = z.infer<typeof danDanAnimeSchema>

const danDanApiResponseSuccessSchema = z.object({
  errorCode: z.literal(0),
  errorMessage: z.string(),
  success: z.literal(true),
})

const danDanApiResponseErrorSchema = z.object({
  errorCode: z.number(),
  errorMessage: z.string(),
  success: z.literal(false),
})

const danDanApiResponseSchema = z.discriminatedUnion('success', [
  danDanApiResponseSuccessSchema,
  danDanApiResponseErrorSchema,
])

export type DanDanApiResponse = z.infer<typeof danDanApiResponseSchema>

const danDanAnimeSearchResponseSuccessSchema =
  danDanApiResponseSuccessSchema.extend({
    animes: z.array(danDanAnimeSchema),
    hasMore: z.boolean(),
  })

export type DanDanAnimeSearchResponseSuccess = z.infer<
  typeof danDanAnimeSearchResponseSuccessSchema
>

export type DanDanAnimeSearchResult = DanDanAnimeSearchResponseSuccess['animes']

export const danDanAnimeSearchResponseSchema = z.discriminatedUnion('success', [
  danDanAnimeSearchResponseSuccessSchema,
  danDanApiResponseErrorSchema,
])

export type DanDanAnimeSearchResponse = z.infer<
  typeof danDanAnimeSearchResponseSchema
>

const danDanCommentResponseSuccessSchema =
  danDanApiResponseSuccessSchema.extend({
    bangumi: z.object({
      type: z.string(),
      typeDescription: z.string(),
      titles: z.array(
        z.object({
          language: z.string(),
          title: z.string(),
        })
      ),
      episodes: z.array(
        z.object({
          episodeId: z.number(),
          episodeTitle: z.string(),
          episodeNumber: z.union([z.coerce.number(), z.string()]), // can be a string, for example "SP1"
        })
      ),
      summary: z.string(),
      metadata: z.array(z.string()),
    }),
  })

// This is a subset of the full response, only including the parts we care about
export const danDanBangumiAnimeResponseSchema = z.discriminatedUnion(
  'success',
  [danDanCommentResponseSuccessSchema, danDanApiResponseErrorSchema]
)

type DanDanBangumiAnimeResponseSuccess = z.infer<
  typeof danDanCommentResponseSuccessSchema
>

export type DanDanBangumiAnimeResult =
  DanDanBangumiAnimeResponseSuccess['bangumi']

// Request types
export interface DanDanAnimeSearchAPIParams {
  anime: string
  episode?: string
}

export interface DanDanCommentAPIParams {
  /**
   * 起始弹幕编号，忽略此编号以前的弹幕。默认值为0
   */
  from: number
  /**
   * 是否同时获取关联的第三方弹幕。默认值为false
   */
  withRelated: boolean
  /**
   * 中文简繁转换。0-不转换，1-转换为简体，2-转换为繁体。
   */
  chConvert: DanDanChConvert
}
