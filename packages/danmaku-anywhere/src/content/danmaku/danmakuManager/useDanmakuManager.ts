import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useDanmakuEngine } from '../../store/danmakuEngineStore'
import { useMediaElementStore } from '../../store/mediaElementStore'
import { useStore } from '../../store/store'

import { useToast } from '@/common/components/toast/toastStore'
import { useDanmakuOptionsSuspense } from '@/common/options/danmakuOptions/useDanmakuOptionsSuspense'
import { Logger } from '@/common/services/Logger'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = () => {
  const { data: options } = useDanmakuOptionsSuspense()
  const danmakuEngine = useDanmakuEngine()
  const { toast } = useToast()
  const { videoNode, containerNode } = useMediaElementStore()
  const { canRefresh, refreshComments } = useRefreshComments()

  const { comments, playbackStatus } = useStore(
    useShallow(({ comments, playbackStatus }) => {
      return { comments, playbackStatus }
    })
  )

  useEffect(() => {
    // if danmaku is created, destroy it when comments are removed
    if (comments.length === 0 && danmakuEngine.created) {
      Logger.debug('Destroying danmaku')
      danmakuEngine.destroy()
      return
    }

    // if media is not ready, do nothing
    if (!containerNode || !videoNode) return

    // create or recreate danmaku
    if (comments.length > 0) {
      Logger.debug('Creating danmaku')
      toast.success(
        `Danmaku mounted: ${useStore.getState().getAnimeName()} (${comments.length})`,
        {
          actionFn: canRefresh ? refreshComments : undefined,
          actionLabel: 'Refresh',
        }
      )
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [videoNode, containerNode, comments, options])

  // in automatic mode, destroy danmaku when playback is stopped
  useEffect(() => {
    if (!danmakuEngine.created) return

    if (playbackStatus === 'stopped') {
      Logger.debug('Destroying danmaku')
      danmakuEngine.destroy()
    }
  }, [playbackStatus])

  useEffect(() => {
    if (!danmakuEngine.created) return

    // recreate danmaku when containerNode or videoNode changes
    if (containerNode && videoNode) {
      Logger.debug('Container changed, recreating danmaku')
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [containerNode])

  useEffect(() => {
    if (!danmakuEngine.created) return

    Logger.debug('Updating danmaku config', options)
    danmakuEngine.updateConfig(options)
  }, [options])

  return danmakuEngine
}
