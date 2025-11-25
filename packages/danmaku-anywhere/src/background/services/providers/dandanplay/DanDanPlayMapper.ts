import type {
  DanDanPlayOf,
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
  ): DanDanPlayOf<SeasonInsert> {
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
  ): DanDanPlayOf<SeasonInsert> {
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
  ): OmitSeasonId<DanDanPlayOf<EpisodeMeta>> {
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
}
