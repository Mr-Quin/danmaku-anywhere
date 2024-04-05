import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useDanmakuEngine } from '../../store/danmakuEngineStore'
import { useMediaElementStore } from '../../store/mediaElementStore'
import { useStore } from '../../store/store'
import { useToast } from '../../store/toastStore'

import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { Logger } from '@/common/services/Logger'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = () => {
  const { data: options } = useDanmakuOptions()
  const danmakuEngine = useDanmakuEngine()
  const { toast } = useToast()
  const { videoNode, containerNode } = useMediaElementStore()

  const { comments, mediaInfo, playbackStatus } = useStore(
    useShallow(({ comments, mediaInfo, playbackStatus, manual }) => {
      return { comments, mediaInfo, playbackStatus, manual }
    })
  )

  useEffect(() => {
    // if danmaku is created, destroy it when status is stopped
    if (danmakuEngine.created) {
      if (playbackStatus === 'stopped' || comments.length === 0) {
        Logger.debug('Destroying danmaku')
        danmakuEngine.destroy()
      }
      return
    }

    // if media is not ready, do nothing
    if (!containerNode || !videoNode) return

    // if danmaku is not created, create it when status is playing
    if (playbackStatus === 'playing' && comments.length > 0) {
      Logger.debug('Creating danmaku', {
        container: containerNode,
        node: videoNode,
        engine: danmakuEngine,
      })
      toast.success(
        `Danmaku mounted: ${mediaInfo?.toString() ?? ''} (${comments.length})`
      )
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [videoNode, comments, options, playbackStatus])

  useEffect(() => {
    if (!danmakuEngine.created) return

    Logger.debug('Updating danmaku config', options)
    danmakuEngine.updateConfig(options)
  }, [options])

  return danmakuEngine
}
