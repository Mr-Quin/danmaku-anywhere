import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuMeta } from '@/common/db/db'
import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { useStore } from '@/content/store/store'

export const useMountDanmakuContent = () => {
  const toast = useToast.use.toast()
  const mountManual = useStore((state) => state.mountManual)
  const getAnimeName = useStore((state) => state.getAnimeName)

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (danmakuMeta: DanmakuMeta) => {
      const data = await queryClient.fetchQuery({
        queryKey: useDanmakuQuerySuspense.queryKey(danmakuMeta.episodeId),
        queryFn: () =>
          chromeRpcClient.danmakuGetByEpisodeId(danmakuMeta.episodeId),
      })

      if (!data) throw new Error('No danmaku found')

      return data
    },
    onSuccess: (data, meta) => {
      toast.success(
        `Danmaku mounted: ${getAnimeName()} (${data.comments.length})`
      )
      mountManual(data.comments, meta)
    },
    onError: (e) => {
      toast.error(`Failed to mount danmaku: ${(e as Error).message}`)
      Logger.debug(e)
    },
  })
}
