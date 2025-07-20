import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

export const useUnmountDanmaku = () => {
  const { toast } = useToast()
  const { t } = useTranslation()

  const { activeFrame, updateFrame } = useStore.use.frame()

  const { unmount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async (frameId: number | void) => {
      const frame = frameId ?? activeFrame?.frameId

      if (frame === undefined)
        throw new Error('Trying to unmount danmaku without an active frame')

      await playerRpcClient.player['relay:command:unmount']({
        frameId: frame,
      })

      return true
    },
    onSuccess: (_, frameId) => {
      if (frameId) updateFrame(frameId, { mounted: false })
      unmount()
      toast.info(t('danmaku.alert.unmounted'))
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}
