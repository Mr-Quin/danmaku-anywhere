import {
  DanmakuType,
  type DanmakuMeta,
  type ManualDanmakuMeta,
} from '../types/danmaku/Danmaku'

export const getEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export const episodeIdToEpisodeNumber = (episodeId: number) => {
  return episodeId % 10000
}

export const isManual = (meta: DanmakuMeta): meta is ManualDanmakuMeta => {
  return meta.type === DanmakuType.Manual
}

export const danmakuMetaToString = (meta: DanmakuMeta) => {
  if (meta.episodeTitle) {
    return `${meta.animeTitle} - ${meta.episodeTitle}`
  }
  return meta.animeTitle
}
