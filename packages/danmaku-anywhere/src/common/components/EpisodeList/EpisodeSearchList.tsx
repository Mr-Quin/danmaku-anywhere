import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { MacCmsParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/maccms'
import { List, ListItem, ListItemText, Skeleton } from '@mui/material'
import { useSuspenseQueries } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import type {
  RenderCustomEpisode,
  RenderEpisode,
} from '@/common/components/EpisodeList/types'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
import { useSearchEpisode } from '@/common/danmaku/queries/useSearchEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { episodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface NormalSeasonListItemProps {
  season: Season
  renderEpisode: RenderEpisode
}

interface CustomSeasonListItemProps {
  season: CustomSeason
  renderEpisode: RenderCustomEpisode
}

interface SeasonListItemProps {
  season: Season | CustomSeason
  renderEpisode: RenderEpisode
  renderCustomEpisode: RenderCustomEpisode
}

const EpisodeSkeleton = () => {
  return (
    <ListItem>
      <Skeleton variant="text" width="100%" height={40} animation="wave" />
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

const EpisodeListInner = ({
  season,
  renderEpisode,
}: NormalSeasonListItemProps) => {
  const { data: episodes } = useSearchEpisode(season.provider, season.id)
  const danmakuResults = useSuspenseQueries({
    queries: episodes.map((episode) => {
      const params = {
        provider: episode.provider,
        indexedId: episode.indexedId,
      } satisfies EpisodeQueryFilter
      return {
        queryKey: episodeQueryKeys.filter(params),
        queryFn: async () => {
          const res = await chromeRpcClient.episodeFilterLite(params)
          if (res.data.length === 0) return null
          return res.data[0]
        },
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Number.POSITIVE_INFINITY,
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

const CustomEpisodeListInner = ({
  season,
  renderEpisode,
}: CustomSeasonListItemProps) => {
  // TODO: Add MacCms as a provider type
  // biome-ignore lint/suspicious/noExplicitAny: temporary
  const episodes = (season as any).episodes as MacCmsParsedPlayUrl[]

  return (
    <List dense disablePadding>
      {episodes.map((episode, i) => {
        return (
          <ErrorBoundary
            fallback={<ListItemText primary="An error occurred" />}
            key={episode.url}
          >
            <Suspense fallback={<EpisodeSkeleton />}>
              {renderEpisode({
                episode,
              })}
            </Suspense>
          </ErrorBoundary>
        )
      })}
    </List>
  )
}

export const EpisodeSearchList = ({
  season,
  renderEpisode,
  renderCustomEpisode,
}: SeasonListItemProps) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
    >
      <Suspense fallback={<FallbackEpisodeList />}>
        {isNotCustom(season) ? (
          <EpisodeListInner season={season} renderEpisode={renderEpisode} />
        ) : (
          <CustomEpisodeListInner
            season={season}
            renderEpisode={renderCustomEpisode}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  )
}
