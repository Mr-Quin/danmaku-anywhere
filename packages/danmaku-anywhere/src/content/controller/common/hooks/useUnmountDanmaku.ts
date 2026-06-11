import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { DanmakuMountMode } from '@/common/telemetry/events'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useStore } from '@/content/controller/store/store'

interface UnmountVariables {
  frameId?: number
  mode?: DanmakuMountMode
}

export const useUnmountDanmaku = () => {
  const { toast } = useToast()
  const { t } = useTranslation()

  const { activeFrame, updateFrame } = useStore.use.frame()

  const { unmount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async (variables: UnmountVariables = {}) => {
      const frame = variables.frameId ?? activeFrame?.frameId

      if (frame === undefined) {
        throw new Error('Trying to unmount danmaku without an active frame')
      }

      await playerRpcClient.player['relay:command:unmount']({
        frameId: frame,
      })

      return true
    },
    onSuccess: (_, variables) => {
      if (variables?.frameId) {
        updateFrame(variables.frameId, { mounted: false })
      }
      unmount()
      toast.info(t('danmaku.alert.unmounted', 'Danmaku Unmounted'))
      getTrackingService().track('danmakuUnmount', {
        mode: variables?.mode ?? 'manual',
      })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}
