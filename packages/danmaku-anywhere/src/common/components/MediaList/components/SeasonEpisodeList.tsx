import { ErrorMessage } from '@/common/components/ErrorMessage'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
import { useEpisodeSearch } from '@/common/danmaku/queries/useEpisodeSearch'
import { episodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { List, ListItem, ListItemText, Skeleton } from '@mui/material'
import { useSuspenseQueries } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

interface SeasonListItemProps {
  season: Season
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

const SeasonEpisodeListInner = ({
  season,
  renderEpisode,
}: SeasonListItemProps) => {
  const { data: episodes } = useEpisodeSearch(season.provider, season.id)
  const danmakuResults = useSuspenseQueries({
    queries: episodes.map((episode) => {
      const params = {
        provider: episode.provider,
        indexedId: episode.indexedId,
      } satisfies EpisodeQueryFilter
      return {
        queryKey: episodeQueryKeys.one(params),
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
