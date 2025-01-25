import { z } from 'zod'

import type { DanDanChConvert } from './enums.js'

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

const danDanEpisodeSchema = z.object({
  episodeId: z.number(),
  episodeTitle: z.string(),
})

const danDanAnimeTypeSchema = z.string()

export type DanDanAnimeType = z.infer<typeof danDanAnimeTypeSchema>

export const danDanSearchAnimeDetailsSchema = z.object({
  animeId: z.number(),
  bangumiId: z.string(),
  animeTitle: z.string(),
  type: z.string(),
  typeDescription: z.string(),
  imageUrl: z.string(),
  startDate: z.string(),
  episodeCount: z.number(),
  rating: z.number(),
  isFavorited: z.boolean(),
})

export type DanDanSearchAnimeDetails = z.infer<
  typeof danDanSearchAnimeDetailsSchema
>

const danDanSearchEpisodesAnimeSchema = z.object({
  animeId: z.number(),
  animeTitle: z.string(),
  type: danDanAnimeTypeSchema,
  typeDescription: z.string(),
  episodes: z.array(danDanEpisodeSchema),
})

const danDanSearchEpisodesResponseSuccessSchema =
  danDanApiResponseSuccessSchema.extend({
    animes: z.array(danDanSearchEpisodesAnimeSchema),
    hasMore: z.boolean(),
  })

export type DanDanSearchEpisodesResponseSuccess = z.infer<
  typeof danDanSearchEpisodesResponseSuccessSchema
>

export type DanDanSearchEpisodesResult =
  DanDanSearchEpisodesResponseSuccess['animes']

export const danDanSearchEpisodesResponseSchema = z.discriminatedUnion(
  'success',
  [danDanSearchEpisodesResponseSuccessSchema, danDanApiResponseErrorSchema]
)

export type DanDanSearchEpisodesResponse = z.infer<
  typeof danDanSearchEpisodesResponseSchema
>

const danDanSearchAnimeDetailsResponseSuccessSchema =
  danDanApiResponseSuccessSchema.extend({
    animes: z.array(danDanSearchAnimeDetailsSchema),
  })

export const danDanSearchAnimeDetailsResponseSchema = z.discriminatedUnion(
  'success',
  [danDanSearchAnimeDetailsResponseSuccessSchema, danDanApiResponseErrorSchema]
)

const danDanCommentResponseSuccessSchema =
  danDanApiResponseSuccessSchema.extend({
    bangumi: z.object({
      animeId: z.number(),
      bangumiId: z.string(),
      animeTitle: z.string(),
      imageUrl: z.string(),
      bangumiUrl: z.string(),
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
export interface DanDanSearchEpisodesAPIParams {
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

const danDanRelatedItemSchema = z.object({
  url: z.string(),
  shift: z.number(),
})

export type DanDanRelatedItem = z.infer<typeof danDanRelatedItemSchema>

export const danDanRelatedSuccessSchema = danDanApiResponseSuccessSchema.extend(
  {
    relateds: z.array(danDanRelatedItemSchema),
  }
)

export const danDanRelatedSchema = z.discriminatedUnion('success', [
  danDanRelatedSuccessSchema,
  danDanApiResponseErrorSchema,
])
