import {
  type BilibiliOf,
  type EpisodeMeta,
  PROVIDER_TO_BUILTIN_ID,
  type SeasonInsert,
  stripHtml,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  BilibiliBangumiInfo,
  BilibiliMedia,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { OmitSeasonId } from '../IDanmakuProvider'

export class BilibiliMapper {
  static toEpisode(
    data: BilibiliBangumiInfo['episodes'][number]
  ): OmitSeasonId<BilibiliOf<EpisodeMeta>> {
    return {
      provider: DanmakuSourceType.Bilibili,
      imageUrl: data.cover,
      title: stripHtml(data.show_title),
      alternativeTitle: [data.long_title, data.share_copy],
      externalLink: data.link,
      providerIds: {
        cid: data.cid,
        aid: data.aid,
      },
      indexedId: data.cid.toString(),
      lastChecked: Date.now(),
      schemaVersion: 4,
    }
  }

  static toSeasonInsert(data: BilibiliMedia): BilibiliOf<SeasonInsert> {
    return {
      provider: DanmakuSourceType.Bilibili,
      providerConfigId: PROVIDER_TO_BUILTIN_ID.Bilibili,
      title: stripHtml(data.title),
      type: data.season_type_name,
      imageUrl: data.cover,
      providerIds: {
        seasonId: data.season_id,
      },
      year:
        data.pubtime > 0
          ? new Date(data.pubtime * 1000).getFullYear()
          : undefined,
      episodeCount: data.ep_size,
      indexedId: data.season_id.toString(),
      schemaVersion: 1,
    }
  }

  static bangumiInfoToSeasonInsert(
    seasonInfo: BilibiliBangumiInfo
  ): BilibiliOf<SeasonInsert> {
    return {
      provider: DanmakuSourceType.Bilibili,
      providerConfigId: PROVIDER_TO_BUILTIN_ID.Bilibili,
      title: stripHtml(seasonInfo.title),
      type: seasonInfo.type.toString(),
      imageUrl: seasonInfo.cover,
      episodeCount: seasonInfo.episodes.length,
      providerIds: {
        seasonId: seasonInfo.season_id,
      },
      indexedId: seasonInfo.season_id.toString(),
      schemaVersion: 1,
    }
  }
}
