import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuMeta } from '@/common/db/db'
import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import { chromeRpcClient, tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'

export const useMountDanmaku = () => {
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (danmakuMeta: DanmakuMeta) => {
      const data = await queryClient.fetchQuery({
        queryKey: useDanmakuQuerySuspense.queryKey(danmakuMeta.episodeId),
        queryFn: () =>
          chromeRpcClient.danmakuGetByEpisodeId(danmakuMeta.episodeId),
      })

      if (!data) throw new Error('No danmaku found')

      await tabRpcClient.danmakuMount({
        meta: danmakuMeta,
        comments: data.comments,
      })
    },
    onSuccess: () => {
      toast.success('Danmaku mounted')
    },
    onError: (e) => {
      toast.error(`Failed to mount danmaku: ${(e as Error).message}`)
      Logger.debug(e)
    },
  })
}
