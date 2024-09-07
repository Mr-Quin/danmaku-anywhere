import { List, ListItemText } from '@mui/material'
import { useSuspenseQueries } from '@tanstack/react-query'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import type { TencentMediaSearchResult } from '@/common/anime/dto'
import { useGetEpisodes } from '@/common/anime/queries/useGetEpisodes'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

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

  const danmakuResults = useSuspenseQueries({
    queries: result.episodes.map((episode) => {
      const params = {
        provider: DanmakuSourceType.Tencent,
        episodeId: episode.vid,
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
            key={episode.vid}
          >
            <Suspense fallback={<ListItemSkeleton />}>
              {renderEpisode({
                provider: DanmakuSourceType.Tencent,
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
