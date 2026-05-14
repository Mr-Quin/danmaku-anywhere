import {
  type CommentEntity,
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

  static toSeasonInsert(data: BilibiliMedia): SeasonInsert {
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

  static manifestSearchToSeasonInsert(item: {
    providerIds: { seasonId: number; mediaId: number }
    title: string
    type: string
    imageUrl?: string
    episodeCount?: number
    year?: number
  }): SeasonInsert {
    return {
      provider: DanmakuSourceType.Bilibili,
      providerConfigId: PROVIDER_TO_BUILTIN_ID.Bilibili,
      title: stripHtml(item.title),
      type: item.type,
      imageUrl: item.imageUrl,
      providerIds: { seasonId: item.providerIds.seasonId },
      indexedId: item.providerIds.seasonId.toString(),
      year: item.year,
      episodeCount: item.episodeCount,
      schemaVersion: 1,
    }
  }

  static manifestSegmentsToComments(
    items: ManifestBilibiliDanmakuElem[]
  ): CommentEntity[] {
    const out: CommentEntity[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const mode = item.mode === 2 || item.mode === 3 ? 1 : item.mode
      out[i] = {
        p: `${Number(item.progress) / 1000},${mode},${item.color},${item.midHash ?? ''}`,
        m: item.content,
      }
    }
    return out
  }

  static manifestEpisodeToEpisodeMeta(item: {
    providerIds: {
      cid: number
      aid: number
      bvid?: string
      epid?: number
    }
    title: string
    episodeNumber: string
    imageUrl?: string
    alternativeTitle?: string[]
  }): OmitSeasonId<EpisodeMeta> {
    return {
      provider: DanmakuSourceType.Bilibili,
      title: stripHtml(item.title).trim(),
      // Bilibili's `show_title` is the raw episode number when bare-numeric
      // ("1", "01") and a label like "PV" / "SP" otherwise. Convert numeric
      // strings so sort/match can use them; pass labels through.
      episodeNumber: BARE_NUMERIC_TITLE_RE.test(item.episodeNumber)
        ? Number.parseInt(item.episodeNumber, 10)
        : item.episodeNumber || undefined,
      alternativeTitle: item.alternativeTitle,
      imageUrl: item.imageUrl,
      providerIds: {
        cid: item.providerIds.cid,
        aid: item.providerIds.aid,
        bvid: item.providerIds.bvid,
        epid: item.providerIds.epid,
      },
      indexedId: item.providerIds.cid.toString(),
      lastChecked: Date.now(),
      schemaVersion: 4,
    }
  }
}

interface ManifestBilibiliDanmakuElem {
  progress: number
  mode: number
  color: number
  midHash?: string
  content: string
}
