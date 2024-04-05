import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { useEventCallback } from '@mui/material'

import { useDanmakuEngine } from '../../../store/danmakuEngineStore'

import type { DanmakuMeta } from '@/common/db/db'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { Logger } from '@/common/services/Logger'
import { useMediaElementStore } from '@/content/store/mediaElementStore'
import { useStore } from '@/content/store/store'
import { useToast } from '@/content/store/toastStore'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = () => {
  const { data: options } = useDanmakuOptions()
  const danmakuEngine = useDanmakuEngine()
  const { videoNode, containerNode } = useMediaElementStore()

  const handleSetDanmaku = useEventCallback(
    (meta: DanmakuMeta, comments: DanDanComment[]) => {
      if (!containerNode || !videoNode) {
        const logString = videoNode
          ? 'Container node is not ready'
          : 'Video node not found'

        useToast.getState().toast.error(logString)
        Logger.debug(logString)
        return
      }

      useToast
        .getState()
        .toast.success(
          `Danmaku mounted: ${meta.animeTitle} ${meta.episodeTitle}`
        )

      if (useStore.getState().activeObserver) {
        Logger.debug(
          'Manual mode is enabled while the page has an active observer'
        )
      }

      Logger.debug('Creating manual danmaku')

      useStore.getState().turnOnManualMode(comments, meta)
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  )

  const handleUnsetDanmaku = useEventCallback(() => {
    if (!danmakuEngine.created) {
      Logger.debug('Danmaku is not created')
      return
    }

    Logger.debug('Danmaku unloaded')
    useToast.getState().toast.info('Danmaku unloaded')
    useStore.getState().turnOffManualMode()
    danmakuEngine.destroy()
  })

  return {
    handleSetDanmaku,
    handleUnsetDanmaku,
  }
}
