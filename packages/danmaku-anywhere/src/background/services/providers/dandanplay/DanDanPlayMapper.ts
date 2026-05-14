import type {
  CommentEntity,
  EpisodeMeta,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  BangumiDetails,
  DanDanPlayQueryContext,
  SearchAnimeDetails,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayProviderConfig } from '@/common/options/providerConfig/schema'
import type { OmitSeasonId } from '../IDanmakuProvider'

export class DanDanPlayMapper {
  static toQueryContext(
    providerConfig: DanDanPlayProviderConfig
  ): DanDanPlayQueryContext {
    if (providerConfig.type === 'DanDanPlay') {
      return {
        isCustom: false,
      }
    }

    const provider = providerConfig
    if (
      !provider.options.baseUrl ||
      provider.options.baseUrl.trim().length === 0
    ) {
      return {
        isCustom: false,
      }
    }

    return {
      isCustom: true,
      baseUrl: provider.options.baseUrl,
      auth:
        provider.options.auth?.enabled && provider.options.auth.headers
          ? {
              headers: provider.options.auth.headers,
            }
          : undefined,
    }
  }

  static searchResultToSeasonInsert(
    item: SearchAnimeDetails,
    providerConfigId: string
  ): SeasonInsert {
    return {
      provider: DanmakuSourceType.DanDanPlay,
      title: item.animeTitle,
      type: item.type,
      imageUrl: item.imageUrl,
      providerIds: {
        animeId: item.animeId,
        bangumiId: item.bangumiId,
      },
      providerConfigId: providerConfigId,
      indexedId: item.animeId.toString(),
      year: new Date(item.startDate).getFullYear(),
      episodeCount: item.episodeCount,
      schemaVersion: 1,
    }
  }

  static bangumiDetailsToSeasonInsert(
    bangumiDetails: BangumiDetails,
    providerConfigId: string
  ): SeasonInsert {
    return {
      provider: DanmakuSourceType.DanDanPlay,
      title: bangumiDetails.animeTitle,
      alternativeTitles: bangumiDetails.titles?.map((t) => t.title),
      type: bangumiDetails.type,
      imageUrl: bangumiDetails.imageUrl,
      providerIds: {
        animeId: bangumiDetails.animeId,
        bangumiId: bangumiDetails.bangumiId,
      },
      providerConfigId: providerConfigId,
      indexedId: bangumiDetails.animeId.toString(),
      episodeCount: bangumiDetails.episodes.length,
      schemaVersion: 1,
    }
  }

  static bangumiEpisodeToEpisodeMeta(
    item: BangumiDetails['episodes'][number]
  ): OmitSeasonId<EpisodeMeta> {
    return {
      provider: DanmakuSourceType.DanDanPlay,
      episodeNumber: item.episodeNumber,
      title: item.episodeTitle,
      providerIds: {
        episodeId: item.episodeId,
      },
      indexedId: item.episodeId.toString(),
      lastChecked: Date.now(),
      schemaVersion: 4,
    }
  }

  static manifestSearchToSeasonInsert(
    item: {
      providerIds: { animeId: number; bangumiId: string }
      title: string
      type: string
      imageUrl?: string
      episodeCount?: number
      year?: number
    },
    providerConfigId: string
  ): SeasonInsert {
    return {
      provider: DanmakuSourceType.DanDanPlay,
      title: item.title,
      type: item.type,
      imageUrl: item.imageUrl,
      providerIds: item.providerIds,
      providerConfigId,
      indexedId: item.providerIds.animeId.toString(),
      year: item.year,
      episodeCount: item.episodeCount,
      schemaVersion: 1,
    }
  }

  static manifestEpisodeToEpisodeMeta(item: {
    providerIds: { episodeId: number }
    title: string
    episodeNumber: string
  }): OmitSeasonId<EpisodeMeta> {
    return {
      provider: DanmakuSourceType.DanDanPlay,
      episodeNumber: item.episodeNumber,
      title: item.title,
      providerIds: { episodeId: item.providerIds.episodeId },
      indexedId: item.providerIds.episodeId.toString(),
      lastChecked: Date.now(),
      schemaVersion: 4,
    }
  }

  static manifestCommentsToComments(
    items: ManifestDdpComment[]
  ): CommentEntity[] {
    const out: CommentEntity[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      out[i] = { cid: item.cid, p: item.p, m: item.m }
    }
    return out
  }
}

interface ManifestDdpComment {
  cid: number
  p: string
  m: string
}
