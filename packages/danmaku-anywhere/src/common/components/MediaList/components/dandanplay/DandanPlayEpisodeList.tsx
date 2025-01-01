import { List, ListItemText } from '@mui/material'
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { DanDanPlaySeason } from '@/common/anime/dto'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuQueryKeys, mediaQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface DandanPlaySeasonsListItemProps {
  season: DanDanPlaySeason
  renderEpisode: RenderEpisode
}

export const DandanPlayEpisodeList = ({
  season,
  renderEpisode,
}: DandanPlaySeasonsListItemProps) => {
  const { data: episodes } = useSuspenseQuery({
    queryKey: mediaQueryKeys.episodes(
      DanmakuSourceType.DanDanPlay,
      season.animeId
    ),
    queryFn: async () => {
      return season.episodes
    },
    staleTime: Infinity,
    retry: false,
  })

  const danmakuResults = useSuspenseQueries({
    queries: episodes.map((episode) => {
      const params = {
        provider: DanmakuSourceType.DanDanPlay,
        episodeId: episode.episodeId,
      }
      return {
        queryKey: danmakuQueryKeys.one(params),
        queryFn: async () => {
          const res = await chromeRpcClient.danmakuGetOneLite(params)
          return res.data
        },
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      }
    }),
  })

  return (
    <List dense disablePadding>
      {episodes.map((episode, i) => {
        const danmakuResult = danmakuResults[i]

        return (
          <ErrorBoundary
            fallback={<ListItemText primary="An error occurred" />}
            key={episode.episodeId}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode({
                provider: DanmakuSourceType.DanDanPlay,
                episode,
                season,
                danmaku: danmakuResult.data,
                isLoading: danmakuResult.isLoading,
              })}
            </Suspense>
          </ErrorBoundary>
        )
      })}
    </List>
  )
}
