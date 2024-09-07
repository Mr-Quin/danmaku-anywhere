import { List, ListItemText } from '@mui/material'
import { useSuspenseQueries } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { BilibiliSeason } from '@/common/anime/dto'
import { useGetEpisodes } from '@/common/anime/queries/useGetEpisodes'
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
  const { data: result } = useGetEpisodes({
    provider: DanmakuSourceType.Bilibili,
    seasonId: season.season_id,
  })

  const danmakuResults = useSuspenseQueries({
    queries: result.episodes.map((episode) => {
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
      {result.episodes.map((episode, i) => {
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
