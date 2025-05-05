import { useMutation } from '@tanstack/react-query'

import { useToast } from '@/common/components/Toast/toastStore'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'
import type { Episode, WithSeason } from '@danmaku-anywhere/danmaku-converter'

// Send danmaku to the frame
export const useMountDanmaku = () => {
  const { toast } = useToast()

  const { mustGetActiveFrame, updateFrame } = useStore.use.frame()
  const { mount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async (danmaku: WithSeason<Episode>) => {
      const res = await playerRpcClient.player.mount({
        frameId: mustGetActiveFrame().frameId,
        data: danmaku.comments,
      })
      if (!res.data) {
        throw new Error('Failed to mount danmaku')
      }
      return true
    },
    onSuccess: (_, danmaku) => {
      mount(danmaku, danmaku.comments)
      updateFrame(mustGetActiveFrame().frameId, { mounted: true })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}
