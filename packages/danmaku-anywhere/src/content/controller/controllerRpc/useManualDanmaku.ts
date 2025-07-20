import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { Logger } from '@/common/Logger'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const mountDanmaku = useMountDanmakuContent()
  const unmountMutation = useUnmountDanmaku()

  const handleSetDanmaku = useEventCallback(
    async (episodes: GenericEpisodeLite[]) => {
      Logger.debug('Requested manual danmaku')
      useStore.getState().danmaku.toggleManualMode(true)
      return mountDanmaku.mutateAsync(episodes)
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
