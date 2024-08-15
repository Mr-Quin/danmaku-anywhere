import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { hasIntegration } from '@/common/danmaku/enums'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import { Logger } from '@/common/Logger'
import { useMediaElementStore } from '@/content/store/mediaElementStore'
import { useStore } from '@/content/store/store'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { t } = useTranslation()
  const { videoNode, containerNode } = useMediaElementStore()

  const handleSetDanmaku = useEventCallback((data: Danmaku) => {
    if (!containerNode || !videoNode) {
      const logString = videoNode
        ? t('danmaku.error.containerNotFound')
        : t('danmaku.error.videoNotFound')

      useToast.getState().toast.error(logString)
      Logger.debug(logString)

      // Error is returned to the client
      throw new Error(logString)
    }

    if (hasIntegration(useStore.getState().integration)) {
      Logger.debug(
        'Manual mode is enabled while the page has an active observer'
      )
    }

    Logger.debug('Requested manual danmaku')

    useStore.getState().mountManual(data)
  })

  const handleUnsetDanmaku = useEventCallback(() => {
    Logger.debug('Requested to unload danmaku')
    useStore.getState().unmountManual()
  })

  return {
    handleSetDanmaku,
    handleUnsetDanmaku,
  }
}
