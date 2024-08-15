import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmaku,
  DanDanPlayDanmaku,
  Danmaku,
  DanmakuLite,
} from '@/common/danmaku/models/entity/db'
import type {
  CustomMeta,
  DanDanPlayMeta,
  DanDanPlayMetaComputed,
  DanDanPlayMetaDto,
  DanmakuMeta,
} from '@/common/danmaku/models/meta'

export const CURRENT_SCHEMA_VERSION = 2

export const computeEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export const episodeIdToEpisodeNumber = (episodeId: number) => {
  return episodeId % 10000
}

export const getNextEpisodeId = (episodeId: number) => {
  return episodeId + 1
}

export const getNextEpisodeMeta = (
  meta: DanDanPlayMeta
): DanDanPlayMetaComputed => {
  return {
    ...meta,
    episodeId: getNextEpisodeId(meta.episodeId),
    episodeTitle: undefined,
  }
}

export const getKey = (danmaku: DanmakuLite) => {
  return `${danmaku.provider}-${danmaku.episodeId ?? danmaku.episodeTitle}`
}

export const getEpisodeId = (meta: DanmakuMeta | DanDanPlayMetaDto) => {
  switch (meta.provider) {
    case DanmakuSourceType.DDP:
      return meta.episodeId
    case DanmakuSourceType.Bilibili:
      return meta.cid
    default:
      throw new Error(`Unsupported provider: ${meta.provider}`)
  }
}

export const isCustomDanmaku = (meta: DanmakuMeta): meta is CustomMeta => {
  return meta.provider === DanmakuSourceType.Custom
}

export const danmakuToString = (danmaku: DanmakuLite) => {
  return `${danmaku.seasonTitle} - ${danmaku.episodeTitle}`
}

export function assertIsDanmaku<T extends DanmakuSourceType>(
  danmaku: Danmaku,
  provider: T
): asserts danmaku is Extract<Danmaku, { provider: T }> {
  if (danmaku.provider !== provider) {
    throw new Error(
      `Unexpected danmaku provider: ${danmaku.provider}, expected: ${provider}`
    )
  }
}

export function isDanmakuType<T extends DanmakuSourceType>(
  danmaku: Danmaku,
  provider: T
): danmaku is Extract<Danmaku, { provider: T }>
export function isDanmakuType<T extends DanmakuSourceType>(
  danmaku: DanmakuLite,
  provider: T
): danmaku is Extract<DanmakuLite, { provider: T }>
export function isDanmakuType<T extends DanmakuSourceType>(
  danmaku: DanmakuLite,
  provider: T
): danmaku is Extract<DanmakuLite, { provider: T }> {
  return danmaku.provider === provider
}

export const danmakuUtils = {
  isDanDanPlay(danmaku: DanmakuLite): danmaku is DanDanPlayDanmaku {
    return danmaku.provider === DanmakuSourceType.DDP
  },
  isCustomCache(danmaku: Danmaku): danmaku is CustomDanmaku {
    return danmaku.provider === DanmakuSourceType.Custom
  },
}
