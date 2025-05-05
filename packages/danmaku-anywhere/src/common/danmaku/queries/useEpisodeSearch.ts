import {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { EpisodeMeta, WithSeason } from '@/common/danmaku/types/v4/schema'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
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
