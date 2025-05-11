import type { z } from 'zod'
import { type ByProvider, DanmakuSourceType } from '../../provider/provider.js'
import type { SeasonInsertV1 } from '../../season/index.js'
import type { zEpisodeImportV1 } from '../v1/schema.js'
import type { zEpisodeImportV2 } from '../v2/schema.js'
import type {
  BiliBiliDanmakuInsertV3,
  CustomDanmakuInsertV3,
  DanDanPlayDanmakuInsertV3,
  DanmakuInsertV3,
  TencentDanmakuInsertV3,
} from '../v3/schema.js'
import type { zEpisodeImportV3 } from '../v3/schemaZod.js'
import type { CustomEpisodeInsertV4, EpisodeInsertV4 } from '../v4/schema.js'

function v1ToV3(v1Data: z.infer<typeof zEpisodeImportV1>): DanmakuInsertV3 {
  if (v1Data.type === 1) {
    // DanDanPlay
    return {
      provider: DanmakuSourceType.DanDanPlay,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: 3,
      params: v1Data.params,
      meta: {
        provider: DanmakuSourceType.DanDanPlay,
        ...v1Data.meta,
        episodeTitle:
          v1Data.meta.episodeTitle ?? v1Data.meta.episodeId.toString(),
      },
      episodeTitle: v1Data.meta.episodeTitle ?? v1Data.meta.animeTitle,
      seasonTitle: v1Data.meta.animeTitle,
      episodeId: v1Data.meta.episodeId,
      seasonId: v1Data.meta.animeId,
    }
  } else if (v1Data.type === 0) {
    // Custom
    return {
      provider: DanmakuSourceType.Custom,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: 3,
      meta: {
        provider: DanmakuSourceType.Custom,
        seasonTitle: v1Data.meta.animeTitle, // Rename animeTitle to seasonTitle
        episodeTitle:
          v1Data.meta.episodeTitle ?? v1Data.meta.episodeNumber!.toString(),
      },
      episodeTitle:
        v1Data.meta.episodeTitle ?? v1Data.meta.episodeNumber!.toString(),
      seasonTitle: v1Data.meta.animeTitle,
    }
  } else {
    throw new Error('Unsupported data type')
  }
}

function v2ToV3(v2Data: z.infer<typeof zEpisodeImportV2>): DanmakuInsertV3 {
  if (v2Data.provider === 0) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.Custom,
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.Custom,
      },
    }
  } else if (v2Data.provider === 1) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.DanDanPlay,
      params: v2Data.params ?? {},
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.DanDanPlay,
      },
    }
  } else if (v2Data.provider === 2) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.Bilibili,
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.Bilibili,
      },
    }
  } else if (v2Data.provider === 3) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.Tencent,
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.Tencent,
      },
    }
  }
  return v2Data
}

function v3ToV3(v3Data: z.infer<typeof zEpisodeImportV3>): DanmakuInsertV3 {
  if (v3Data.provider === 'DanDanPlay') {
    return {
      ...v3Data,
      params: v3Data.params ?? {},
    }
  }
  return v3Data
}

const v3ExtractSeason = (
  item:
    | DanDanPlayDanmakuInsertV3
    | BiliBiliDanmakuInsertV3
    | TencentDanmakuInsertV3
): SeasonInsertV1 => {
  switch (item.provider) {
    case DanmakuSourceType.DanDanPlay: {
      return {
        provider: DanmakuSourceType.DanDanPlay,
        providerIds: {
          animeId: item.meta.animeId,
        },
        title: item.seasonTitle,
        type: '',
        indexedId: item.meta.animeId.toString(),
        schemaVersion: 1,
      } satisfies SeasonInsertV1
    }
    case DanmakuSourceType.Bilibili: {
      return {
        provider: DanmakuSourceType.Bilibili,
        providerIds: {
          seasonId: item.meta.seasonId,
        },
        title: item.seasonTitle,
        type: '',
        indexedId: item.meta.seasonId.toString(),
        schemaVersion: 1,
      } satisfies SeasonInsertV1
    }
    case DanmakuSourceType.Tencent: {
      return {
        provider: DanmakuSourceType.Tencent,
        providerIds: {
          cid: item.meta.cid,
        },
        title: item.seasonTitle,
        type: '',
        indexedId: item.meta.cid.toString(),
        schemaVersion: 1,
      } satisfies SeasonInsertV1
    }
  }
}

const v3ToV4 = (
  item:
    | DanDanPlayDanmakuInsertV3
    | BiliBiliDanmakuInsertV3
    | TencentDanmakuInsertV3,
  seasonId: number
):
  | ByProvider<EpisodeInsertV4, DanmakuSourceType.DanDanPlay>
  | ByProvider<EpisodeInsertV4, DanmakuSourceType.Tencent>
  | ByProvider<EpisodeInsertV4, DanmakuSourceType.Bilibili> => {
  const baseUpdate = {
    comments: item.comments,
    commentCount: item.commentCount,
    lastChecked: Date.now(),
    schemaVersion: 4,
  } as const

  const getEpisode = ():
    | ByProvider<EpisodeInsertV4, DanmakuSourceType.DanDanPlay>
    | ByProvider<EpisodeInsertV4, DanmakuSourceType.Tencent>
    | ByProvider<EpisodeInsertV4, DanmakuSourceType.Bilibili> => {
    if (item.provider === 'DanDanPlay') {
      return {
        ...baseUpdate,
        provider: item.provider,
        seasonId,
        title: item.episodeTitle,
        providerIds: {
          episodeId: item.meta.episodeId,
        },
        indexedId: item.meta.episodeId.toString(),
        params: item.params || {},
      } satisfies ByProvider<EpisodeInsertV4, DanmakuSourceType.DanDanPlay>
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
      } satisfies ByProvider<EpisodeInsertV4, DanmakuSourceType.Bilibili>
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
      } satisfies ByProvider<EpisodeInsertV4, DanmakuSourceType.Tencent>
    }
  }

  return getEpisode()
}

const customV3ToV4 = (item: CustomDanmakuInsertV3): CustomEpisodeInsertV4 => {
  return {
    provider: item.provider,
    title: item.episodeTitle || item.seasonTitle,
    comments: item.comments,
    commentCount: item.commentCount,
    schemaVersion: 4,
  }
}

export const episodeMigration = {
  v1ToV3,
  v2ToV3,
  v3ToV3,
  v3ExtractSeason,
  v3ToV4,
  customV3ToV4,
}
