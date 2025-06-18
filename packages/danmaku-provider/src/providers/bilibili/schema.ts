import { CommentMode, zRgb888 } from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'
import { BiliBiliMediaType } from './enums.js'

const zBilibiliApiResponseBase = z.object({
  code: z.number(),
  message: z.string(),
})

export type BilibiliApiResponseBase = z.infer<typeof zBilibiliApiResponseBase>

export const zBilibiliUserInfo = zBilibiliApiResponseBase.extend({
  data: z.object({
    isLogin: z.boolean(),
  }),
})

export type BilibiliUserInfo = z.infer<typeof zBilibiliUserInfo>['data']

const zBilibiliSearchMedia = z.object({
  type: z.enum(['media_ft', 'media_bangumi']),
  media_id: z.number(), // mdid
  season_id: z.number(), // ssid
  title: z.string(),
  media_type: z.nativeEnum(BiliBiliMediaType),
  cover: z.string().url(),
  season_type_name: z.string(),
  season_type: z.number(),
  ep_size: z.number(),
  desc: z.string(),
  pubtime: z.number(),
})

export type BilibiliMedia = z.infer<typeof zBilibiliSearchMedia>

export const zBilibiliSearchResponse = zBilibiliApiResponseBase.extend({
  data: z
    .object({
      result: z.array(zBilibiliSearchMedia).optional().default([]),
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

const zBilibiliEpisode = z.object({
  badge: z.string(),
  aid: z.number(),
  bvid: z.string(),
  cid: z.number(),
  // cover image url
  cover: z.string().url(),
  link: z.string().url(),
  // epid
  id: z.number(),
  title: z.string(),
  long_title: z.string(),
  show_title: z.string(),
  share_copy: z.string(), // title for sharing
})

export const zBilibiliBangumiInfoResponse = zBilibiliApiResponseBase.extend({
  result: z
    .object({
      episodes: z.array(zBilibiliEpisode).transform((episodes) => {
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
      cover: z.string(),
    })
    .optional(),
})

export type BilibiliBangumiInfo = NonNullable<
  z.infer<typeof zBilibiliBangumiInfoResponse>['result']
>

export const zBilibiliCommentProto = z.object({
  elems: z
    .array(
      z
        .object({
          progress: z.number().int(), // time in milliseconds
          mode: z
            .number()
            .int()
            .transform((mode) => {
              switch (mode) {
                case 1:
                case 2:
                case 3:
                  return CommentMode.rtl
                case 4:
                  return CommentMode.bottom
                case 5:
                  return CommentMode.top
                case 6:
                  return CommentMode.ltr
                default:
                  return null
              }
            }),
          fontsize: z.number().int(),
          color: zRgb888,
          content: z.string(),
        })
        .transform((data) => {
          // discard other modes
          if (data.mode === null) return null

          return {
            p: `${data.progress / 1000},${data.mode},${data.color}`,
            m: data.content,
          }
        })
    )
    .transform((elems) => elems.filter((elem) => elem !== null)),
})
