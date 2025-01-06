import { useEventCallback } from '@mui/material'

import type { Danmaku } from '@/common/danmaku/models/danmaku'
import { Logger } from '@/common/Logger'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useMountDanmaku'
import { useStore } from '@/content/controller/store/store'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { mountDanmaku } = useLoadDanmaku()
  const unmountMutation = useUnmountDanmaku()

  const handleSetDanmaku = useEventCallback(async (data: Danmaku) => {
    Logger.debug('Requested manual danmaku')
    useStore.getState().mountManual()
    return mountDanmaku(data)
  })

  const handleUnsetDanmaku = useEventCallback(() => {
    Logger.debug('Requested to unmount danmaku')
    return unmountMutation.mutateAsync()
  })

  return {
    handleSetDanmaku,
    handleUnsetDanmaku,
  }
}
