import { useMutation } from '@tanstack/react-query'

import { useToast } from '@/common/components/Toast/toastStore'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

export const useShowDanmaku = () => {
  const { toast } = useToast()
  const { isVisible, toggleVisible } = useStore.use.danmaku()

  const { getActiveFrame } = useStore.use.frame()

  return useMutation({
    mutationFn: async () => {
      const activeFrame = getActiveFrame()
      if (!activeFrame) {
        throw new Error('No active frame')
      }
      await playerRpcClient.player['relay:command:show']({
        frameId: activeFrame.frameId,
        data: !isVisible,
      })
    },
    onSuccess: () => {
      toggleVisible()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}
