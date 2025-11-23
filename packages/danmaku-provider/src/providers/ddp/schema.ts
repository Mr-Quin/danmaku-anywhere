import { z } from 'zod'

import { DanDanChConvert } from './enums.js'

const zResponseSuccess = z.object({
  errorCode: z.literal(0),
  errorMessage: z.string(),
  success: z.literal(true),
})

const zResponseError = z.object({
  errorCode: z.number(),
  errorMessage: z.string(),
  success: z.literal(false),
})

export const zResponseBase = z.discriminatedUnion('success', [
  zResponseSuccess,
  zResponseError,
])

const createResponseType = <T extends z.ZodObject<any>>(success: T) => {
  return z.discriminatedUnion('success', [success, zResponseError])
}

const zSearchEpisodeDetails = z.object({
  episodeId: z.number(),
  episodeTitle: z.string(),
})

const zAnimeType = z.string()

export type AnimeType = z.infer<typeof zAnimeType>

export const zSearchAnimeDetails = z.object({
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

export type SearchAnimeDetails = z.infer<typeof zSearchAnimeDetails>

const zSearchEpisodesAnime = z.object({
  animeId: z.number(),
  animeTitle: z.string(),
  type: zAnimeType,
  typeDescription: z.string(),
  episodes: z.array(zSearchEpisodeDetails),
})

export const zSearchEpisodesResponse = createResponseType(
  zResponseSuccess.extend({
    animes: z.array(zSearchEpisodesAnime),
    hasMore: z.boolean(),
  })
)

export type SearchEpisodesResponse = z.infer<typeof zSearchEpisodesResponse>

export type SearchEpisodesAnime = z.infer<typeof zSearchEpisodesAnime>

export const zSearchAnimeResponse = createResponseType(
  zResponseSuccess.extend({
    animes: z.array(zSearchAnimeDetails),
  })
)

const zBangumiDetails = z.object({
  animeId: z.number(),
  bangumiId: z.string(),
  animeTitle: z.string(),
  imageUrl: z.string(),
  bangumiUrl: z.union([z.literal(''), z.string().url()]).optional(),
  type: z.string(),
  typeDescription: z.string(),
  titles: z
    .array(
      z.object({
        language: z.string(),
        title: z.string(),
      })
    )
    .optional(),
  episodes: z.array(
    z.object({
      episodeId: z.number(),
      episodeTitle: z.string(),
      episodeNumber: z.union([z.coerce.number(), z.string()]), // can be a string, for example "SP1"
    })
  ),
  summary: z.string().optional(),
  metadata: z.array(z.string()).optional(),
})

export type BangumiDetails = z.infer<typeof zBangumiDetails>

export const zBangumiDetailsResponse = createResponseType(
  zResponseSuccess.extend({ bangumi: zBangumiDetails })
)

export const zSearchEpisodeQuery = z.object({
  anime: z.string(),
  episode: z.string().optional(),
})

export type SearchEpisodesQuery = z.input<typeof zSearchEpisodeQuery>

// comments
export const zCommentData = z.object({
  cid: z.number().optional(),
  p: z.string(),
  m: z.string(),
})

export type CommentData = z.infer<typeof zCommentData>

export const zCommentResponseV2 = z.object({
  count: z.number(),
  comments: z.array(zCommentData),
})

export type CommentResponseV2 = z.infer<typeof zCommentResponseV2>

export const zGetCommentQuery = z.object({
  /**
   * 起始弹幕编号，忽略此编号以前的弹幕。默认值为0
   */
  from: z.number().optional().default(0),
  /**
   * 是否同时获取关联的第三方弹幕。默认值为false
   */
  withRelated: z.boolean().optional().default(false),
  /**
   * 中文简繁转换。0-不转换，1-转换为简体，2-转换为繁体。
   */
  chConvert: z
    .nativeEnum(DanDanChConvert)
    .optional()
    .default(DanDanChConvert.None),
})

export type GetCommentQuery = z.input<typeof zGetCommentQuery>

export const zGetExtCommentQuery = z.object({
  url: z.string(),
  chConvert: z.nativeEnum(DanDanChConvert).optional(),
})

export type GetExtCommentQuery = z.input<typeof zGetExtCommentQuery>

export const zSendCommentResponseV2 = zResponseSuccess.extend({
  cid: z.number(),
})

export type SendCommentResponse = z.infer<typeof zSendCommentResponseV2>

export const zSendCommentRequest = z.object({
  /**
   * 弹幕出现时间，单位为秒
   */
  time: z.number(),
  /**
   * 弹幕模式：1-普通弹幕，4-顶部弹幕，5-底部弹幕
   */
  mode: z.union([z.literal(1), z.literal(4), z.literal(5)]),
  /**
   * 弹幕颜色，计算方式为 Rx255x255+Gx255+B
   */
  color: z.number(),
  /**
   * 弹幕内容，不能长于100个字符
   */
  comment: z.string().max(100),
})

export type SendCommentRequest = z.infer<typeof zSendCommentRequest>

const zRelatedItemV2 = z.object({
  url: z.string(),
  shift: z.number(),
})

export type RelatedItemV2 = z.infer<typeof zRelatedItemV2>

export const zRelatedResponseV2 = createResponseType(
  zResponseSuccess.extend({
    relateds: z.array(zRelatedItemV2),
  })
)

// register
const zUserName = z.string().min(5).max(20)
const zPassword = z.string().min(5).max(20)
const zEmail = z.string().max(50).email()
const zScreenName = z.string().max(50)

/**
 * The register and login request body also requires these fields:
 * appId: string
 * unixTimestamp: number
 * hash: string -> md5(`${appId}${email}${password}${screenName}${unixTimestamp}${appSecret}`)
 *                 findMyId does not use password in the hash
 *
 * These are injected by the proxy server since the appId and appSecret are not exposed to the client.
 */
export const zRegisterRequestV2 = z.object({
  userName: zUserName,
  password: zPassword,
  email: zEmail,
  screenName: zScreenName,
})

export type RegisterRequestV2 = z.infer<typeof zRegisterRequestV2>

export const zResetPasswordRequestV2 = z.object({
  userName: zUserName,
  email: zEmail,
})

export type ResetPasswordRequestV2 = z.infer<typeof zResetPasswordRequestV2>

export const zFindMyIdRequestV2 = z.object({
  email: zEmail,
})

export type FindMyIdRequestV2 = z.infer<typeof zFindMyIdRequestV2>

export const zUserPrivileges = z.object({
  member: z.union([z.string().datetime(), z.null()]),
  resmonitor: z.union([z.string().datetime(), z.null()]),
})

export const zLoginResponse = zResponseSuccess.extend({
  registerRequired: z.boolean(),
  userId: z.number().int(),
  userName: z.string().nullish(),
  token: z.string(),
  tokenExpireTime: z.string().datetime(),
  userType: z.string(),
  screenName: z.string(),
  profileImage: z.string(),
  appScope: z.string(),
  privileges: zUserPrivileges,
  code: z.string(),
  ts: z.number(),
})

export type LoginResponse = z.infer<typeof zLoginResponse>

export const zLoginRequest = z.object({
  userName: zUserName,
  password: zPassword,
})

export type LoginRequest = z.infer<typeof zLoginRequest>
