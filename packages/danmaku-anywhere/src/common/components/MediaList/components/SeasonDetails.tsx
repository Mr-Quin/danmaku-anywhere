import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { SeasonEpisodeList } from '@/common/components/MediaList/components/SeasonEpisodeList'
import type { RenderEpisode } from '@/common/components/MediaList/types'

type SeasonDetailsProps = {
  season: SeasonV1
  renderEpisode: RenderEpisode
}

export const SeasonDetails = ({
  season,
  renderEpisode,
}: SeasonDetailsProps) => {
  return (
    <div>
      <SeasonEpisodeList season={season} renderEpisode={renderEpisode} />
    </div>
  )
}
