import { BilibiliMediaSearchResult } from '@/common/anime/dto'
import { Suspense } from 'react'
import { useGetBilibiliEpisodes } from '@/common/anime/queries/useGetBilibiliEpisodes'
import { List, ListItemText } from '@mui/material'
import { DanmakuProviderType } from '@/common/anime/enums'
import { RenderEpisode } from '@/common/components/MediaList/types'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import { ErrorBoundary } from 'react-error-boundary'

type BilibiliSeasonsListItemProps = {
  season: BilibiliMediaSearchResult['data'][number]
  renderEpisode: RenderEpisode
}
export const BilibiliEpisodeList = ({
  season,
  renderEpisode,
}: BilibiliSeasonsListItemProps) => {
  const { data: res } = useGetBilibiliEpisodes(season.season_id)

  return (
    <List dense disablePadding>
      {res.episodes.map((episode) => {
        return (
          <ErrorBoundary
            fallback={<ListItemText primary="An error occurred" />}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode(DanmakuProviderType.Bilibili, episode, res)}
            </Suspense>
          </ErrorBoundary>
        )
      })}
    </List>
  )
}
