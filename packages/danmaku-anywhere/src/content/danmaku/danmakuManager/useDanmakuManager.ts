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
  const { videoNode, containerNode, videoSrc } = useMediaElementStore()
  const { canRefresh, refreshComments } = useRefreshComments()

  const { comments, playbackStatus, hasComments, resetMediaState } = useStore(
    useShallow(({ comments, playbackStatus, hasComments, resetMediaState }) => {
      return { comments, playbackStatus, hasComments, resetMediaState }
    })
  )

  useEffect(() => {
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

  useEffect(() => {
    if (!hasComments && danmakuEngine.created) {
      Logger.debug('Comments removed, destroying danmaku')
      danmakuEngine.destroy()
    }
  }, [hasComments])

  useEffect(() => {
    if (!videoNode && danmakuEngine.created) {
      Logger.debug('Video node removed, removing comments')
      resetMediaState()
    }
  }, [videoNode])

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
    if (containerNode && videoNode && videoSrc) {
      Logger.debug('Container or videoSrc changed, recreating danmaku')
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [containerNode, videoSrc])

  useEffect(() => {
    if (!danmakuEngine.created) return

    Logger.debug('Updating danmaku config', options)
    danmakuEngine.updateConfig(options)
  }, [options])

  return danmakuEngine
}
