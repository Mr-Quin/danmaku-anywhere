import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/toast/toastStore'
import { Logger } from '@/common/services/Logger'
import type { DanmakuMeta } from '@/common/types/danmaku/Danmaku'
import { useMediaElementStore } from '@/content/store/mediaElementStore'
import { useStore } from '@/content/store/store'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { t } = useTranslation()
  const { videoNode, containerNode } = useMediaElementStore()

  const handleSetDanmaku = useEventCallback(
    (meta: DanmakuMeta, comments: DanDanComment[]) => {
      if (!containerNode || !videoNode) {
        const logString = videoNode
          ? t('danmaku.error.containerNotFound')
          : t('danmaku.error.videoNotFound')

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

      useStore.getState().mountManual(comments, meta)
    }
  )

  const handleUnsetDanmaku = useEventCallback(() => {
    Logger.debug('Requested to unload danmaku')
    useStore.getState().unmountManual()
  })

  return {
    handleSetDanmaku,
    handleUnsetDanmaku,
  }
}
