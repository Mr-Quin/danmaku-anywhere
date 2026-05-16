import type {
  CustomSeason,
  EpisodeLite,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { MacCmsParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/maccms'
import { List, ListItem, ListItemText, Skeleton } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import type {
  RenderCustomEpisode,
  RenderEpisode,
} from '@/common/components/EpisodeList/types'
import { ErrorMessage } from '@/common/components/ErrorMessage'
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

interface EpisodeRowProps {
  episode: WithSeason<EpisodeMeta>
  danmaku: WithSeason<EpisodeLite> | null
  isLoading: boolean
  renderEpisode: RenderEpisode
}

const EpisodeRow = ({
  episode,
  danmaku,
  isLoading,
  renderEpisode,
}: EpisodeRowProps) => {
  return (
    <ErrorBoundary
      fallback={
        <ListItem>
          <ListItemText primary="An error occurred" />
        </ListItem>
      }
    >
      {renderEpisode({
        episode,
        danmaku,
        isLoading,
      })}
    </ErrorBoundary>
  )
}

const EpisodeListInner = ({
  season,
  renderEpisode,
}: NormalSeasonListItemProps) => {
  const { data: episodes } = useSearchEpisode(season.id)

  const danmakuQuery = useQuery({
    queryKey: episodeQueryKeys.filterLite({ seasonId: season.id }),
    queryFn: async () => {
      const res = await chromeRpcClient.episodeFilterLite({
        seasonId: season.id,
      })
      return res.data
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const danmakuByIndexedId = useMemo(() => {
    const map = new Map<string, WithSeason<EpisodeLite>>()
    for (const item of danmakuQuery.data ?? []) {
      map.set(item.indexedId, item)
    }
    return map
  }, [danmakuQuery.data])

  return (
    <List dense disablePadding>
      {episodes.map((episode) => {
        return (
          <EpisodeRow
            key={episode.indexedId}
            episode={episode}
            danmaku={danmakuByIndexedId.get(episode.indexedId) ?? null}
            isLoading={danmakuQuery.isLoading}
            renderEpisode={renderEpisode}
          />
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
            fallback={
              <ListItem>
                <ListItemText primary="An error occurred" />
              </ListItem>
            }
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
      fallbackRender={({ error }) => (
        <ErrorMessage message={(error as Error).message} />
      )}
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
