import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'

// listen to comment changes and mount/unmount the danmaku engine
// TODO: this should be a state machine
export const useLegacyDanmakuManager = (
  videoNode: HTMLVideoElement | null,
  containerNode: HTMLElement | null,
  videoSrc?: string
) => {
  const { t } = useTranslation()
  const { data: options } = useDanmakuOptions()
  const { toast } = useToast()
  const danmakuEngine = useRef(new DanmakuManager()).current
  const { canRefresh, refreshComments } = useRefreshComments()

  const { comments, hasComments, resetMediaState } = useStore(
    useShallow(({ comments, hasComments, resetMediaState }) => {
      return { comments, hasComments, resetMediaState }
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
