import type {
  CustomSeason,
  EpisodeLite,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { MacCmsParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/maccms'
import { Box, Skeleton, Stack } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Fragment, Suspense, useMemo } from 'react'
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
  filter?: string
}

interface CustomSeasonListItemProps {
  season: CustomSeason
  renderEpisode: RenderCustomEpisode
  filter?: string
}

interface SeasonListItemProps {
  season: Season | CustomSeason
  renderEpisode: RenderEpisode
  renderCustomEpisode: RenderCustomEpisode
  filter?: string
}

function EpisodeSkeleton() {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5 }}
    >
      <Skeleton variant="text" width={20} height={12} />
      <Skeleton variant="rounded" width={24} height={24} />
      <Skeleton variant="text" sx={{ flex: 1 }} height={14} />
    </Box>
  )
}

function FallbackEpisodeList() {
  return (
    <Stack spacing={0.25} sx={{ py: 0.5 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <EpisodeSkeleton key={`skeleton-${i}`} />
      ))}
    </Stack>
  )
}

function matchesFilter(title: string, filter?: string): boolean {
  if (!filter) {
    return true
  }
  return title.toLowerCase().includes(filter.toLowerCase())
}

function EpisodeListInner({
  season,
  renderEpisode,
  filter,
}: NormalSeasonListItemProps) {
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
    <Stack spacing={0.25}>
      {episodes.map((episode, index) => {
        if (!matchesFilter(episode.title, filter)) {
          return null
        }
        return (
          <Fragment key={episode.indexedId}>
            {renderEpisode({
              episode,
              index,
              danmaku: danmakuByIndexedId.get(episode.indexedId) ?? null,
              isLoading: danmakuQuery.isLoading,
            })}
          </Fragment>
        )
      })}
    </Stack>
  )
}

function CustomEpisodeListInner({
  season,
  renderEpisode,
  filter,
}: CustomSeasonListItemProps) {
  // TODO: Add MacCms as a provider type
  // biome-ignore lint/suspicious/noExplicitAny: temporary
  const episodes = (season as any).episodes as MacCmsParsedPlayUrl[]

  return (
    <Stack spacing={0.25}>
      {episodes.map((episode, index) => {
        if (!matchesFilter(episode.title, filter)) {
          return null
        }
        return (
          <Suspense key={episode.url} fallback={<EpisodeSkeleton />}>
            {renderEpisode({ episode, index })}
          </Suspense>
        )
      })}
    </Stack>
  )
}

export function EpisodeSearchList({
  season,
  renderEpisode,
  renderCustomEpisode,
  filter,
}: SeasonListItemProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <ErrorMessage message={(error as Error).message} />
      )}
    >
      <Suspense fallback={<FallbackEpisodeList />}>
        {isNotCustom(season) ? (
          <EpisodeListInner
            season={season}
            renderEpisode={renderEpisode}
            filter={filter}
          />
        ) : (
          <CustomEpisodeListInner
            season={season}
            renderEpisode={renderCustomEpisode}
            filter={filter}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  )
}
