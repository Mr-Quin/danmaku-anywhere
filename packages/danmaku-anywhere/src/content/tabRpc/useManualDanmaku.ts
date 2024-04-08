import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { useEventCallback } from '@mui/material'

import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuMeta } from '@/common/db/db'
import { Logger } from '@/common/services/Logger'
import { useMediaElementStore } from '@/content/store/mediaElementStore'
import { useStore } from '@/content/store/store'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { videoNode, containerNode } = useMediaElementStore()

  const handleSetDanmaku = useEventCallback(
    (meta: DanmakuMeta, comments: DanDanComment[]) => {
      if (!containerNode || !videoNode) {
        const logString = videoNode
          ? 'Container node is not ready'
          : 'Video node not found'

        useToast.getState().toast.error(logString)
        Logger.debug(logString)

        // Error is returned to the client
        throw new Error(logString)
      }

      if (useStore.getState().integration) {
        Logger.debug(
          'Manual mode is enabled while the page has an active observer'
        )
      }

      Logger.debug('Requested manual danmaku')

      useStore.getState().turnOnManualMode(comments, meta)
    }
  )

  const handleUnsetDanmaku = useEventCallback(() => {
    Logger.debug('Requested to unload danmaku')
    useStore.getState().turnOffManualMode()
  })

  return {
    handleSetDanmaku,
    handleUnsetDanmaku,
  }
}
