import { useMutation } from '@tanstack/react-query'

import { useToast } from '@/common/components/Toast/toastStore'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

export const useShowDanmaku = () => {
  const { toast } = useToast()
  const { isVisible, toggleVisible } = useStore.use.danmaku()

  const { mustGetActiveFrame } = useStore.use.frame()

  return useMutation({
    mutationFn: async () => {
      await playerRpcClient.player['relay:command:show']({
        frameId: mustGetActiveFrame().frameId,
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
