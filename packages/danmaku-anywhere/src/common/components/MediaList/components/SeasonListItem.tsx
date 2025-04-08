import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { BilibiliEpisodeList } from '@/common/components/MediaList/components/bilibili/BilibiliEpisodeList'
import { DandanPlayEpisodeList } from '@/common/components/MediaList/components/dandanplay/DandanPlayEpisodeList'
import { TencentEpisodeList } from '@/common/components/MediaList/components/tencent/TencentEpisodeList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'

export const SeasonListItem = <T extends SeasonV1>({
  provider,
  season,
  renderEpisodes,
}: {
  provider: T['provider']
  season: T
  renderEpisodes: RenderEpisode
  dense?: boolean
}) => {
  if (provider === DanmakuSourceType.Bilibili) {
    return (
      <BilibiliEpisodeList season={season} renderEpisode={renderEpisodes} />
    )
  } else if (provider === DanmakuSourceType.Tencent) {
    return <TencentEpisodeList season={season} renderEpisode={renderEpisodes} />
  } else {
    return (
      <DandanPlayEpisodeList season={season} renderEpisode={renderEpisodes} />
    )
  }
}
