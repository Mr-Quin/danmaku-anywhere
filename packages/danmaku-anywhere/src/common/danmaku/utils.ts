import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuCacheDbModel,
  DanmakuCacheDbModel,
  DDPDanmakuCacheDbModel,
} from '@/common/danmaku/models/danmakuCache/db'
import type {
  CustomDanmakuCache,
  DanmakuCache,
  DDPDanmakuCache,
} from '@/common/danmaku/models/danmakuCache/dto'
import type {
  CustomDanmakuMeta,
  DanmakuMeta,
  DDPDanmakuMeta,
} from '@/common/danmaku/models/danmakuMeta'
import { Logger } from '@/common/Logger'

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

export function toDanmakuCache(
  cacheDbModel: DDPDanmakuCacheDbModel
): DDPDanmakuCache
export function toDanmakuCache(
  cacheDbModel: CustomDanmakuCacheDbModel
): CustomDanmakuCache
export function toDanmakuCache(
  cacheDbModel: DanmakuCacheDbModel
): DanmakuCache {
  if (cacheDbModel.meta.type === DanmakuSourceType.DDP) {
    return {
      ...cacheDbModel,
      type: DanmakuSourceType.DDP,
    } as DDPDanmakuCache
  } else if (cacheDbModel.meta.type === DanmakuSourceType.Custom) {
    return {
      ...cacheDbModel,
      type: DanmakuSourceType.Custom,
    } as CustomDanmakuCache
  }
  Logger.debug('Unknown danmaku cache type', cacheDbModel)
  throw new Error('Unknown danmaku cache type')
}
