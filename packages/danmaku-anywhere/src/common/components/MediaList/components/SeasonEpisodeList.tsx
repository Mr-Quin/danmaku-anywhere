import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { QueryEpisodeFilter } from '@/common/danmaku/dto'
import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { EpisodeMeta, WithSeason } from '@/common/danmaku/types/v4/schema'
import { danmakuQueryKeys, mediaQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { List, ListItem, ListItemText, Skeleton } from '@mui/material'
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

interface SeasonListItemProps {
  season: SeasonV1
  renderEpisode: RenderEpisode
}

const EpisodeSkeleton = () => {
  return (
    <ListItem>
      <Skeleton
        variant="text"
        width="100%"
        height={40}
        animation="wave"
      ></Skeleton>
    </ListItem>
  )
}

const FallbackEpisodeList = () => {
  return (
    <List dense disablePadding>
      {Array.from({ length: 10 }).map((_, i) => {
        return <EpisodeSkeleton key={i} />
      })}
    </List>
  )
}

const queryFnMap: Record<
  RemoteDanmakuSourceType,
  (seasonId: number) => Promise<{ data: WithSeason<EpisodeMeta>[] }>
> = {
  [DanmakuSourceType.DanDanPlay]: chromeRpcClient.episodeSearchDanDanPlay,
  [DanmakuSourceType.Bilibili]: chromeRpcClient.episodeSearchBilibili,
  [DanmakuSourceType.Tencent]: chromeRpcClient.episodeSearchTencent,
}

const SeasonEpisodeListInner = ({
  season,
  renderEpisode,
}: SeasonListItemProps) => {
  const { data: episodes } = useSuspenseQuery({
    queryKey: mediaQueryKeys.episodes(season.provider, season.id),
    queryFn: () => queryFnMap[season.provider](season.id),
    select: (data) => data.data,
    staleTime: Infinity,
    retry: false,
  })

  const danmakuResults = useSuspenseQueries({
    queries: episodes.map((episode) => {
      const params = {
        provider: episode.provider,
        indexedId: episode.indexedId,
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
            <Suspense fallback={<EpisodeSkeleton />}>
              {renderEpisode({
                episode,
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

export const SeasonEpisodeList = (props: SeasonListItemProps) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
    >
      <Suspense fallback={<FallbackEpisodeList />}>
        <SeasonEpisodeListInner {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
