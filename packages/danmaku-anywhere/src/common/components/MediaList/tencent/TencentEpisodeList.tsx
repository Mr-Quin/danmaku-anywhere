import { List, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { TencentMediaSearchResult } from '@/common/anime/dto'
import { useGetEpisodes } from '@/common/anime/queries/useGetEpisodes'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'

interface TencentEpisodeListItemProps {
  season: TencentMediaSearchResult['data'][number]
  renderEpisode: RenderEpisode
}

export const TencentEpisodeList = ({
  season,
  renderEpisode,
}: TencentEpisodeListItemProps) => {
  const { data: result } = useGetEpisodes({
    provider: DanmakuSourceType.Tencent,
    seasonId: season.doc.id,
  })

  return (
    <List dense disablePadding>
      {result.data.map((episode) => {
        return (
          <ErrorBoundary
            fallback={<ListItemText primary="An error occurred" />}
            key={episode.vid}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode({
                provider: DanmakuSourceType.Tencent,
                episode,
                season: season,
              })}
            </Suspense>
          </ErrorBoundary>
        )
      })}
    </List>
  )
}
