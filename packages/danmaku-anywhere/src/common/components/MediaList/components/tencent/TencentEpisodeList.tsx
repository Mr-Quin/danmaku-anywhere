import { List, ListItemText } from '@mui/material'
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { QueryEpisodeFilter } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuQueryKeys, mediaQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface TencentEpisodeListItemProps {
  season: SeasonV1
  renderEpisode: RenderEpisode
}

export const TencentEpisodeList = ({
  season,
  renderEpisode,
}: TencentEpisodeListItemProps) => {
  const { data: episodes } = useSuspenseQuery({
    queryKey: mediaQueryKeys.episodes(DanmakuSourceType.Tencent, season.id),
    queryFn: async () => {
      return chromeRpcClient.episodeSearchTencent(season.id)
    },
    select: (res) => res.data,
    staleTime: Infinity,
    retry: false,
  })

  const danmakuResults = useSuspenseQueries({
    queries: episodes.map((episode) => {
      const params = {
        provider: DanmakuSourceType.Tencent,
        indexedId: episode.indexedId.toString(),
      } satisfies QueryEpisodeFilter
      return {
        queryKey: danmakuQueryKeys.one(params),
        queryFn: async () => {
          const res = await chromeRpcClient.episodeGetOneLite(params)
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
            key={episode.indexedId}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode({
                episode,
                season: season,
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
