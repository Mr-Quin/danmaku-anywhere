import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import { Logger } from '@/common/Logger'
import { useStore } from '@/content/store/store'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { t } = useTranslation()

  const handleSetDanmaku = useEventCallback((data: Danmaku) => {
    // Throws, error is returned to the client
    try {
      Logger.debug('Requested manual danmaku')

      useStore.getState().mountManual(data)
    } catch (err) {
      Logger.error(err)
      if (err instanceof Error) {
        useToast.getState().toast.error(t(err.message))
      }
      throw err
    }
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
