import { List, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { BilibiliMediaSearchResult } from '@/common/anime/dto'
import { useGetEpisodes } from '@/common/anime/queries/useGetEpisodes'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'

interface BilibiliSeasonsListItemProps {
  season: BilibiliMediaSearchResult['data'][number]
  renderEpisode: RenderEpisode
}

export const BilibiliEpisodeList = ({
  season,
  renderEpisode,
}: BilibiliSeasonsListItemProps) => {
  const { data: result } = useGetEpisodes({
    provider: DanmakuSourceType.Bilibili,
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
              {renderEpisode({
                provider: DanmakuSourceType.Bilibili,
                episode,
                season: result,
              })}
            </Suspense>
          </ErrorBoundary>
        )
      })}
    </List>
  )
}
