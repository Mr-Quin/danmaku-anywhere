import { List, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { BilibiliMediaSearchResult } from '@/common/anime/dto'
import { DanmakuProviderType } from '@/common/anime/enums'
import { useGetEpisodes } from '@/common/anime/queries/useGetEpisodes'
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
  const { data: result } = useGetEpisodes({
    provider: DanmakuProviderType.Bilibili,
    seasonId: season.season_id,
  })

  return (
    <List dense disablePadding>
      {result.episodes.map((episode) => {
        return (
          <ErrorBoundary
            fallback={<ListItemText primary="An error occurred" />}
            key={episode.cid}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode(DanmakuProviderType.Bilibili, episode, result)}
            </Suspense>
          </ErrorBoundary>
        )
      })}
    </List>
  )
}
