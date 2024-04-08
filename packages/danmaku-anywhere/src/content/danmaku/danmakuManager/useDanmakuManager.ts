import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useDanmakuEngine } from '../../store/danmakuEngineStore'
import { useMediaElementStore } from '../../store/mediaElementStore'
import { useStore } from '../../store/store'

import { useToast } from '@/common/components/toast/toastStore'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { Logger } from '@/common/services/Logger'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = () => {
  const { data: options } = useDanmakuOptions()
  const danmakuEngine = useDanmakuEngine()
  const { toast } = useToast()
  const { videoNode, containerNode } = useMediaElementStore()

  const { comments, mediaInfo, playbackStatus, manual } = useStore(
    useShallow(({ comments, mediaInfo, playbackStatus, manual }) => {
      return { comments, mediaInfo, playbackStatus, manual }
    })
  )

  useEffect(() => {
    // recreate danmaku when containerNode or videoNode changes
    if (containerNode && videoNode && danmakuEngine.created) {
      Logger.debug('Container changed, reparenting danmaku')
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [containerNode])

  // handle manual mode
  useEffect(() => {
    if (!manual) {
      // when leaving manual mode, destroy the engine
      return () => danmakuEngine.destroy()
    }

    // if media is not ready, do nothing
    if (!containerNode || !videoNode) return

    // create or recreate danmaku when comments change
    if (comments.length > 0) {
      const meta = useStore.getState().danmakuMeta
      Logger.debug('Creating manual danmaku')
      toast.success(
        `Manual Danmaku mounted: ${
          meta ? `${meta.animeTitle} - ${meta.episodeTitle ?? ''}` : ''
        } (${comments.length})`
      )

      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [manual, videoNode, containerNode, comments])

  // handle automatic mode
  useEffect(() => {
    if (manual) {
      return
    }

    // if danmaku is created, destroy it when status is stopped
    if (
      (playbackStatus === 'stopped' || comments.length === 0) &&
      danmakuEngine.created
    ) {
      Logger.debug('Destroying danmaku')
      danmakuEngine.destroy()
      return
    }

    // if media is not ready, do nothing
    if (!containerNode || !videoNode) return

    // create or recreate danmaku when status is playing
    if (playbackStatus === 'playing' && comments.length > 0) {
      Logger.debug('Creating danmaku')
      toast.success(
        `Danmaku mounted: ${mediaInfo?.toString() ?? ''} (${comments.length})`
      )
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [manual, videoNode, containerNode, comments, options, playbackStatus])

  useEffect(() => {
    if (!danmakuEngine.created) return

    Logger.debug('Updating danmaku config', options)
    danmakuEngine.updateConfig(options)
  }, [options])

  return danmakuEngine
}
