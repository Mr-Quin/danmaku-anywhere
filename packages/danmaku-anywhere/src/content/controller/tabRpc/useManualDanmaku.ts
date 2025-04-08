import { useEventCallback } from '@mui/material'

import { Logger } from '@/common/Logger'
import { EpisodeV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { mountDanmaku } = useLoadDanmaku()
  const unmountMutation = useUnmountDanmaku()

  const handleSetDanmaku = useEventCallback(
    async (data: WithSeason<EpisodeV4>) => {
      Logger.debug('Requested manual danmaku')
      useStore.getState().danmaku.toggleManualMode(true)
      return mountDanmaku(data)
    }
  )

  const handleUnsetDanmaku = useEventCallback(() => {
    Logger.debug('Requested to unmount danmaku')
    return unmountMutation.mutateAsync()
  })

  return {
    handleSetDanmaku,
    handleUnsetDanmaku,
  }
}
