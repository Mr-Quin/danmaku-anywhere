import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import type {
  DanDanPlayMeta,
  DanDanPlayMetaComputed,
  DanDanPlayMetaDto,
  DanmakuMeta,
} from '@/common/danmaku/models/meta'

export const CURRENT_SCHEMA_VERSION = 2

export const computeEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

const getNextEpisodeId = (episodeId: number) => {
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

export const danmakuToString = (danmaku: DanmakuLite) => {
  return `${danmaku.seasonTitle} - ${danmaku.episodeTitle}`
}

export function assertDanmakuProvider<
  T extends { provider: DanmakuSourceType },
  S extends DanmakuSourceType,
>(data: T, provider: S): asserts data is Extract<T, { provider: S }> {
  if (data.provider !== provider) {
    throw new Error(
      `Unexpected  provider: ${data.provider}, expected: ${provider}`
    )
  }
}

export function isDanmakuProvider<
  T extends { provider: DanmakuSourceType },
  S extends DanmakuSourceType,
>(data: T, provider: S): data is Extract<T, { provider: S }> {
  return data.provider === provider
}
