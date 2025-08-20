import { useSuspenseQuery } from '@tanstack/react-query'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useSearchEpisode = (
  provider: RemoteDanmakuSourceType,
  seasonId: number
) => {
  return useSuspenseQuery({
    queryKey: seasonQueryKeys.episodes(provider, seasonId),
    queryFn: () => {
      return chromeRpcClient.episodeSearch({
        provider,
        seasonId,
      })
    },
    select: (data) => data.data,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
