import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuCacheDbModel,
  CustomDanmakuCacheDbModelInsert,
  DanmakuCacheDbModel,
  DanmakuCacheDbModelInsert,
  DDPDanmakuCacheDbModel,
} from '@/common/danmaku/models/danmakuCache/db'
import type {
  CustomDanmakuCache,
  CustomDanmakuCacheImportDto,
  DanmakuCache,
  DanmakuCacheImportDto,
  DDPDanmakuCache,
  DDPDanmakuCacheImportDto,
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

export const danmakuUtils = {
  isDDPCache: (
    cacheDbModel: DanmakuCacheDbModel
  ): cacheDbModel is DDPDanmakuCacheDbModel => {
    return cacheDbModel.meta.type === DanmakuSourceType.DDP
  },
  isCustomCache: (
    cacheDbModel: DanmakuCacheDbModel
  ): cacheDbModel is CustomDanmakuCacheDbModel => {
    return cacheDbModel.meta.type === DanmakuSourceType.Custom
  },
  dbModelToCache,
  importDtoToDbModel,
}

function importDtoToDbModel(
  dto: CustomDanmakuCacheImportDto
): CustomDanmakuCacheDbModelInsert
function importDtoToDbModel(
  dto: DDPDanmakuCacheImportDto
): DDPDanmakuCacheDbModel
function importDtoToDbModel(
  dto: DanmakuCacheImportDto
): DanmakuCacheDbModelInsert
function importDtoToDbModel(
  dto: DanmakuCacheImportDto
): DanmakuCacheDbModelInsert {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...rest } = dto
  return rest
}

function dbModelToCache(cacheDbModel: DDPDanmakuCacheDbModel): DDPDanmakuCache
function dbModelToCache(
  cacheDbModel: CustomDanmakuCacheDbModel
): CustomDanmakuCache
function dbModelToCache(cacheDbModel: DanmakuCacheDbModel): DanmakuCache
function dbModelToCache(cacheDbModel: DanmakuCacheDbModel): DanmakuCache {
  if (danmakuUtils.isDDPCache(cacheDbModel)) {
    return {
      ...cacheDbModel,
      count: cacheDbModel.comments.length,
      type: DanmakuSourceType.DDP,
    } satisfies DDPDanmakuCache
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
