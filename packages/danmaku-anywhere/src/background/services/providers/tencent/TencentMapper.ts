import {
  type CommentEntity,
  CommentMode,
  type EpisodeMeta,
  hexToRgb888,
  PROVIDER_TO_BUILTIN_ID,
  type SeasonInsert,
  stripHtml,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  TencentEpisodeListItem,
  TencentPageDetailResponse,
} from '@danmaku-anywhere/danmaku-provider/tencent'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { OmitSeasonId } from '../IDanmakuProvider'

type TencentSeasonItem =
  Required<TencentPageDetailResponse>['data']['module_list_datas'][number]['module_datas'][0]['item_data_lists']['item_datas'][0]

export class TencentMapper {
  static toEpisodeMeta(
    item: TencentEpisodeListItem
  ): OmitSeasonId<EpisodeMeta> {
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
  ): SeasonInsert {
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

  static manifestBarrageToComments(
    items: ManifestBarrageItem[]
  ): CommentEntity[] {
    const out: CommentEntity[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      out[i] = {
        p: `${Number(item.time_offset) / 1000},${CommentMode.rtl},${parseTencentBarrageColor(item.content_style)}`,
        m: item.content,
      }
    }
    return out
  }
}

interface ManifestBarrageItem {
  id: string
  content: string
  time_offset: string | number
  content_style?: string
}

function parseTencentBarrageColor(style: string | undefined): number {
  if (!style) {
    return hexToRgb888('#ffffff')
  }
  try {
    const parsed = JSON.parse(style) as {
      color?: string
      gradient_colors?: [string, string]
    }
    const hex = parsed.gradient_colors?.[0] ?? parsed.color
    return hexToRgb888(hex ? `#${hex}` : '#ffffff')
  } catch {
    return hexToRgb888('#ffffff')
  }
}
