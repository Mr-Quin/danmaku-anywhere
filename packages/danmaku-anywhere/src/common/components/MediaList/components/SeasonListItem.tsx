import type {
  BilibiliMediaSearchResult,
  DanDanPlayMediaSearchResult,
  MediaSearchResult,
  TencentMediaSearchResult,
} from '@/common/anime/dto'
import { BilibiliEpisodeList } from '@/common/components/MediaList/components/bilibili/BilibiliEpisodeList'
import { DandanPlayEpisodeList } from '@/common/components/MediaList/components/dandanplay/DandanPlayEpisodeList'
import { TencentEpisodeList } from '@/common/components/MediaList/components/tencent/TencentEpisodeList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'

export const SeasonListItem = <T extends MediaSearchResult>({
  provider,
  season,
  renderEpisodes,
  dense,
}: {
  provider: T['provider']
  season: T['data'][number]
  renderEpisodes: RenderEpisode
  dense?: boolean
}) => {
  dense // prevent unused variable error

  if (provider === DanmakuSourceType.Bilibili) {
    const bilibiliSeason = season as BilibiliMediaSearchResult['data'][number]
    return (
      <BilibiliEpisodeList
        season={bilibiliSeason}
        renderEpisode={renderEpisodes}
      />
    )
  } else if (provider === DanmakuSourceType.Tencent) {
    const tencentSeason = season as TencentMediaSearchResult['data'][number]
    return (
      <TencentEpisodeList
        season={tencentSeason}
        renderEpisode={renderEpisodes}
      />
    )
  } else {
    const danDanPlaySeason =
      season as DanDanPlayMediaSearchResult['data'][number]
    return (
      <DandanPlayEpisodeList
        season={danDanPlaySeason}
        renderEpisode={renderEpisodes}
      />
    )
  }
}
