import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmaku,
  CustomDanmakuInsert,
  Danmaku,
  DanmakuInsert,
  DanDanPlayDanmaku,
} from '@/common/danmaku/models/danmakuCache/db'
import type {
  CustomDanmakuCache,
  CustomDanmakuImport,
  DanmakuCache,
  DanmakuImport,
  DanDanPlayDanmakuCache,
  DanDanPlayDanmakuImport,
} from '@/common/danmaku/models/danmakuCache/dto'
import type {
  CustomMeta,
  DanmakuMeta,
  DanDanPlayMeta,
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

export const getNextEpisodeMeta = (meta: DanDanPlayMeta) => {
  return {
    ...meta,
    episodeId: getNextEpisodeId(meta.episodeId),
    episodeTitle: undefined,
  }
}

export const isCustomDanmaku = (meta: DanmakuMeta): meta is CustomMeta => {
  return meta.type === DanmakuSourceType.Custom
}

export const danmakuMetaToString = (meta: DanmakuMeta) => {
  if (meta.episodeTitle) {
    return `${meta.animeTitle} - ${meta.episodeTitle}`
  }
  return meta.animeTitle
}

export const danmakuUtils = {
  isDDPCache: (cacheDbModel: Danmaku): cacheDbModel is DanDanPlayDanmaku => {
    return cacheDbModel.meta.type === DanmakuSourceType.DDP
  },
  isCustomCache: (cacheDbModel: Danmaku): cacheDbModel is CustomDanmaku => {
    return cacheDbModel.meta.type === DanmakuSourceType.Custom
  },
  dbModelToCache,
  importDtoToDbModel,
}

function importDtoToDbModel(dto: CustomDanmakuImport): CustomDanmakuInsert
function importDtoToDbModel(dto: DanDanPlayDanmakuImport): DanDanPlayDanmaku
function importDtoToDbModel(dto: DanmakuImport): DanmakuInsert
function importDtoToDbModel(dto: DanmakuImport): DanmakuInsert {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...rest } = dto
  return rest
}

function dbModelToCache(cacheDbModel: DanDanPlayDanmaku): DanDanPlayDanmakuCache
function dbModelToCache(cacheDbModel: CustomDanmaku): CustomDanmakuCache
function dbModelToCache(cacheDbModel: Danmaku): DanmakuCache
function dbModelToCache(cacheDbModel: Danmaku): DanmakuCache {
  if (danmakuUtils.isDDPCache(cacheDbModel)) {
    return {
      ...cacheDbModel,
      count: cacheDbModel.comments.length,
      type: DanmakuSourceType.DDP,
    } satisfies DanDanPlayDanmakuCache
  } else if (danmakuUtils.isCustomCache(cacheDbModel)) {
    return {
      ...cacheDbModel,
      count: cacheDbModel.comments.length,
      type: DanmakuSourceType.Custom,
    } satisfies CustomDanmakuCache
  }
  Logger.debug('Unknown danmaku cache type', cacheDbModel)
  throw new Error('Unknown danmaku cache type')
}
