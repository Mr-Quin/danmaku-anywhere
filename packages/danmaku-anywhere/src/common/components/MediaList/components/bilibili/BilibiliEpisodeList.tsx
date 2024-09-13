import { List, ListItemText } from '@mui/material'
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { BilibiliSeason } from '@/common/anime/dto'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface BilibiliSeasonsListItemProps {
  season: BilibiliSeason
  renderEpisode: RenderEpisode
}

export const BilibiliEpisodeList = ({
  season,
  renderEpisode,
}: BilibiliSeasonsListItemProps) => {
  const { data: episodes } = useSuspenseQuery({
    queryKey: mediaKeys.episodes(DanmakuSourceType.Bilibili, season.season_id),
    queryFn: async () => {
      return chromeRpcClient.episodesGetBilibili(season.season_id)
    },
    staleTime: Infinity,
    retry: false,
  })

  const danmakuResults = useSuspenseQueries({
    queries: episodes.map((episode) => {
      const params = {
        provider: DanmakuSourceType.Bilibili,
        episodeId: episode.cid,
      }
      return {
        queryKey: danmakuKeys.one(params),
        queryFn: async () => chromeRpcClient.danmakuGetOneLite(params),
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
            key={episode.cid}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode({
                provider: DanmakuSourceType.Bilibili,
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
