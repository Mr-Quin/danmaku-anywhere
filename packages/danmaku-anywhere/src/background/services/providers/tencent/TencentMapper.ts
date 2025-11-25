import {
  type EpisodeMeta,
  PROVIDER_TO_BUILTIN_ID,
  type SeasonInsert,
  stripHtml,
  type TencentOf,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  TencentEpisodeListItem,
  TencentPageDetailResponse,
  TencentVideoSeason,
} from '@danmaku-anywhere/danmaku-provider/tencent'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { OmitSeasonId } from '../IDanmakuProvider'

type TencentSeasonItem =
  Required<TencentPageDetailResponse>['data']['module_list_datas'][number]['module_datas'][0]['item_data_lists']['item_datas'][0]

export class TencentMapper {
  static toSeasonInsert(data: TencentVideoSeason): TencentOf<SeasonInsert> {
    return {
      provider: DanmakuSourceType.Tencent,
      providerConfigId: PROVIDER_TO_BUILTIN_ID.Tencent,
      title: stripHtml(data.videoInfo.title),
      type: data.videoInfo.videoType.toString(),
      imageUrl: data.videoInfo.imgUrl,
      providerIds: {
        cid: data.doc.id,
      },
      indexedId: data.doc.id,
      episodeCount: data.videoInfo.episodeSites[0].totalEpisode,
      year: data.videoInfo.year,
      schemaVersion: 1,
    }
  }

  static toEpisodeMeta(
    item: TencentEpisodeListItem
  ): OmitSeasonId<TencentOf<EpisodeMeta>> {
    return {
      provider: DanmakuSourceType.Tencent,
      title: stripHtml(item.play_title),
      alternativeTitle: [item.title, item.union_title],
      providerIds: {
        vid: item.vid,
      },
      imageUrl: item.image_url,
      indexedId: item.vid.toString(),
      schemaVersion: 4,
      lastChecked: Date.now(),
    }
  }

  static pageDetailsToSeasonInsert(
    foundSeason: TencentSeasonItem
  ): TencentOf<SeasonInsert> {
    return {
      provider: DanmakuSourceType.Tencent,
      providerConfigId: PROVIDER_TO_BUILTIN_ID.Tencent,
      title: stripHtml(foundSeason.item_params.title),
      type: foundSeason.item_type.toString(),
      imageUrl: foundSeason.item_params.new_pic_vt,
      providerIds: {
        cid: foundSeason.item_params['report.cid'],
      },
      episodeCount: foundSeason.item_params.episode_all,
      indexedId: foundSeason.item_params['report.cid'],
      schemaVersion: 1,
    }
  }
}
