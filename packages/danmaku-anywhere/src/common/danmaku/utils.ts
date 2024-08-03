import { DanmakuSourceType } from '@/common/danmaku/types/enums'
import {
  type CustomDanmakuMeta,
  type DDPDanmakuMeta,
  type DanmakuMeta,
} from '@/common/danmaku/types/types'

export const getEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export const episodeIdToEpisodeNumber = (episodeId: number) => {
  return episodeId % 10000
}

export const getNextEpisodeId = (episodeId: number) => {
  return episodeId + 1
}

export const getNextEpisodeMeta = (meta: DDPDanmakuMeta) => {
  return {
    ...meta,
    episodeId: getNextEpisodeId(meta.episodeId),
    episodeTitle: undefined,
  }
}

export const isCustomDanmaku = (
  meta: DanmakuMeta
): meta is CustomDanmakuMeta => {
  return meta.type === DanmakuSourceType.Custom
}

export const danmakuMetaToString = (meta: DanmakuMeta) => {
  if (meta.episodeTitle) {
    return `${meta.animeTitle} - ${meta.episodeTitle}`
  }
  return meta.animeTitle
}
