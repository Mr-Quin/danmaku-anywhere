import type {
  BiliBiliDanmakuV3,
  CustomDanmakuV3,
  DanDanPlayDanmakuV3,
  TencentDanmakuV3,
} from '@/common/danmaku/types/v3/schema'
import {
  BiliBiliEpisodeV4,
  CustomEpisodeV4,
  DanDanPlayEpisodeV4,
  TencentEpisodeV4,
} from '@/common/danmaku/types/v4/schema'

type WithoutId<T> = Omit<T, 'id'>

const migrateV3ToV4 = (
  item: DanDanPlayDanmakuV3 | BiliBiliDanmakuV3 | TencentDanmakuV3,
  seasonId: number
):
  | WithoutId<DanDanPlayEpisodeV4>
  | WithoutId<TencentEpisodeV4>
  | WithoutId<BiliBiliEpisodeV4> => {
  const baseUpdate = {
    comments: item.comments,
    commentCount: item.commentCount,
    version: item.version,
    timeUpdated: item.timeUpdated,
    lastChecked: Date.now(),
    schemaVersion: 4,
  } as const

  const getEpisode = ():
    | WithoutId<DanDanPlayEpisodeV4>
    | WithoutId<TencentEpisodeV4>
    | WithoutId<BiliBiliEpisodeV4> => {
    if (item.provider === 'DanDanPlay') {
      return {
        ...baseUpdate,
        provider: item.provider,
        seasonId,
        title: item.episodeTitle,
        providerIds: {
          episodeId: item.meta.episodeId,
        },
        indexedId: item.meta.animeId.toString(),
        params: item.params || {},
      } satisfies WithoutId<DanDanPlayEpisodeV4>
    } else if (item.provider === 'Bilibili') {
      return {
        ...baseUpdate,
        title: item.meta.title,
        provider: item.provider,
        seasonId,
        providerIds: {
          cid: item.meta.cid,
          aid: item.meta.aid,
          bvid: item.meta.bvid,
        },
        indexedId: item.meta.cid.toString(),
      } satisfies WithoutId<BiliBiliEpisodeV4>
    } else {
      return {
        ...baseUpdate,
        title: item.episodeTitle,
        provider: item.provider,
        seasonId,
        providerIds: {
          vid: item.meta.vid,
        },
        indexedId: item.meta.vid.toString(),
      } satisfies WithoutId<TencentEpisodeV4>
    }
  }

  return getEpisode()
}

const migrateCustomV3ToV4 = (
  item: CustomDanmakuV3
): WithoutId<CustomEpisodeV4> => {
  return {
    provider: item.provider,
    title: item.episodeTitle,
    comments: item.comments,
    commentCount: item.commentCount,
    version: item.version,
    timeUpdated: item.timeUpdated,
    schemaVersion: 4,
  }
}

export const episodeV4Migration = {
  migrateV3ToV4,
  migrateCustomV3ToV4,
}
