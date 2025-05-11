import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type {} from '@danmaku-anywhere/danmaku-converter'
import { useSuspenseQuery } from '@tanstack/react-query'

export const useEpisodeSearch = (
  provider: RemoteDanmakuSourceType,
  seasonId: number
) => {
  return useSuspenseQuery({
    queryKey: seasonQueryKeys.episodes(provider, seasonId),
    queryFn: () =>
      chromeRpcClient.episodeSearch({
        provider,
        seasonId,
      }),
    select: (data) => data.data,
    staleTime: Infinity,
    retry: false,
  })
}
