import type { BilibiliMedia } from '../providers/bilibili/index.js'
import type { SearchAnimeDetails } from '../providers/ddp/index.js'
import { TencentVideoSeason } from '../providers/tencent/index.js'
import {
  BiliSeason,
  DanDanSeason,
  DanmakuSourceType,
  TencentSeason,
} from './schema/v1/index.js'

export class CanonicalSeason {
  static fromDanDanPlay({
    animeTitle,
    animeId,
    type,
    imageUrl,
    bangumiId,
  }: SearchAnimeDetails): DanDanSeason {
    return {
      provider: DanmakuSourceType.DanDanPlay,
      title: animeTitle,
      type,
      imageUrl,
      providerIds: {
        animeId,
        bangumiId,
      },
    } satisfies DanDanSeason
  }

  static fromBilibili({
    media_id,
    season_id,
    season_type_name,
    title,
    cover,
  }: BilibiliMedia): BiliSeason {
    return {
      provider: DanmakuSourceType.Bilibili,
      title,
      type: season_type_name,
      imageUrl: cover,
      providerIds: {
        seasonId: season_id,
        mediaId: media_id,
      },
    }
  }

  static fromTencent({
    videoInfo: { typeName, title, imgUrl },
    doc,
  }: TencentVideoSeason): TencentSeason {
    return {
      provider: DanmakuSourceType.Tencent,
      title,
      type: typeName,
      imageUrl: imgUrl,
      providerIds: {
        cid: doc.id,
      },
    }
  }
}

export class CanonicalEpisode {}
