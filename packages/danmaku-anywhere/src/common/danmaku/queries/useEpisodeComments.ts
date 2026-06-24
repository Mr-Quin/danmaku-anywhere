import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { useQuery } from '@tanstack/react-query'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export function useEpisodeComments(episodeId: number, isCustom: boolean) {
  return useQuery({
    queryKey: ['episode-comments', episodeId, isCustom],
    queryFn: async (): Promise<CommentEntity[]> => {
      const { data } = await chromeRpcClient.episodeGetComments({
        episodeId,
        isCustom,
      })
      return data
    },
  })
}
