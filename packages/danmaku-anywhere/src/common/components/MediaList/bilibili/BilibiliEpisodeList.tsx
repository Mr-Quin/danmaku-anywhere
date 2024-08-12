import { List, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { BilibiliMediaSearchResult } from '@/common/anime/dto'
import { DanmakuProviderType } from '@/common/anime/enums'
import { useGetBilibiliEpisodes } from '@/common/anime/queries/useGetBilibiliEpisodes'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'

interface BilibiliSeasonsListItemProps {
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
            key={episode.cid}
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
