import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useSuspenseQuery } from '@tanstack/react-query'

const queryFnMap: Record<
  RemoteDanmakuSourceType,
  (seasonId: number) => Promise<{ data: WithSeason<EpisodeMeta>[] }>
> = {
  [DanmakuSourceType.DanDanPlay]: chromeRpcClient.episodeSearchDanDanPlay,
  [DanmakuSourceType.Bilibili]: chromeRpcClient.episodeSearchBilibili,
  [DanmakuSourceType.Tencent]: chromeRpcClient.episodeSearchTencent,
}

export const useEpisodeSearch = (
  provider: RemoteDanmakuSourceType,
  seasonId: number
) => {
  return useSuspenseQuery({
    queryKey: seasonQueryKeys.episodes(provider, seasonId),
    queryFn: () => queryFnMap[provider](seasonId),
    select: (data) => data.data,
    staleTime: Infinity,
    retry: false,
  })
}
