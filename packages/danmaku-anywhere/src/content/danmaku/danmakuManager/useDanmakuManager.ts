import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useDanmakuEngine } from '../../store/danmakuEngineStore'
import { useMediaElementStore } from '../../store/mediaElementStore'
import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'

// listen to comment changes and mount/unmount the danmaku engine
// TODO: this should be a state machine
export const useDanmakuManager = () => {
  const { t } = useTranslation()
  const { data: options } = useDanmakuOptions()
  const danmakuEngine = useDanmakuEngine()
  const { toast } = useToast()
  const { videoNode, containerNode } = useMediaElementStore()
  const { canRefresh, refreshComments } = useRefreshComments()

  const { comments, playbackStatus, hasComments } = useStore(
    useShallow(({ comments, playbackStatus, hasComments }) => {
      return { comments, playbackStatus, hasComments }
    })
  )

  useEffect(() => {
    // if danmaku is created, destroy it when comments are removed
    if (!hasComments && danmakuEngine.created) {
      Logger.debug('Destroying danmaku')
      danmakuEngine.destroy()
      return
    }

    // if media is not ready, do nothing
    if (!containerNode || !videoNode || !hasComments) return

    // create or recreate danmaku
    Logger.debug('Creating danmaku')
    toast.success(
      t('danmaku.alert.mounted', {
        name: useStore.getState().getAnimeName(),
        count: comments.length,
      }),
      {
        actionFn: canRefresh ? refreshComments : undefined,
        actionLabel: t('danmaku.refresh'),
      }
    )
    danmakuEngine.create(containerNode, videoNode, comments, options)
  }, [videoNode, containerNode, comments, options, hasComments])

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
