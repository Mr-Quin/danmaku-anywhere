import {
  type CommentEntity,
  type EpisodeMeta,
  PROVIDER_TO_BUILTIN_ID,
  type SeasonInsert,
  stripHtml,
} from '@danmaku-anywhere/danmaku-converter'
import type { BilibiliBangumiInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { OmitSeasonId } from '../IDanmakuProvider'

const BARE_NUMERIC_TITLE_RE = /^\d+$/

export class BilibiliMapper {
  static toEpisode(
    data: BilibiliBangumiInfo['episodes'][number]
  ): OmitSeasonId<EpisodeMeta> {
    const title = stripHtml(data.show_title).trim()
    // if title is a bare number, treat it as episode number
    const episodeNumber = BARE_NUMERIC_TITLE_RE.test(title)
      ? Number.parseInt(title, 10)
      : undefined

    return {
      provider: DanmakuSourceType.Bilibili,
      imageUrl: data.cover,
      title,
      episodeNumber,
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

  static bangumiInfoToSeasonInsert(
    seasonInfo: BilibiliBangumiInfo
  ): SeasonInsert {
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

  static manifestSegmentsToComments(
    items: ManifestBilibiliDanmakuElem[]
  ): CommentEntity[] {
    return items.map((item) => {
      const mode = item.mode === 2 || item.mode === 3 ? 1 : item.mode
      return {
        p: `${item.progress / 1000},${mode},${item.color},${item.midHash ?? ''}`,
        m: item.content,
      }
    })
  }
}

interface ManifestBilibiliDanmakuElem {
  progress: number
  mode: number
  color: number
  midHash?: string
  content: string
}
