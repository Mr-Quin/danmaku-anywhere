import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'
import { useDanmakuManager } from '@/content/store/danmakuManager'
import { useStore } from '@/content/store/store'

const manager = useDanmakuManager.getState().manager

export const DanmakuContainer = () => {
  const { data: options } = useDanmakuOptions()

  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const resetMediaState = useStore.use.resetMediaState()

  const { getCanRefresh, refreshComments } = useRefreshComments()

  const setHasVideo = useStore.use.setHasVideo()

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    const videoChangeHandler = () => {
      console.debug('Video changed')

      clearTimeout(timeout)
      setHasVideo(true)
    }

    const videoRemovedHandler = () => {
      console.debug('Video removed')

      // Delay setting hasVideo to false to prevent flickering
      timeout = setTimeout(() => {
        console.debug('Setting hasVideo to false')
        setHasVideo(false)
      }, 1000)

      resetMediaState()
    }

    manager.addEventListener('videoChange', videoChangeHandler)
    manager.addEventListener('videoRemoved', videoRemovedHandler)

    manager.start(config.mediaQuery)
    manager.setParent(containerRef.current!)

    return () => {
      clearTimeout(timeout)
      manager.removeEventListener('videoChange', videoChangeHandler)
      manager.removeEventListener('videoRemoved', videoRemovedHandler)
      manager.stop()
    }
  }, [])

  useEffect(() => {
    const listener = (comments: CommentEntity[]) => {
      Logger.debug('Danmaku created')
      toast.success(
        t('danmaku.alert.mounted', {
          name: useStore.getState().getAnimeName(),
          count: comments.length,
        }),
        {
          actionFn: getCanRefresh() ? refreshComments : undefined,
          actionLabel: t('danmaku.refresh'),
        }
      )
    }

    manager.addEventListener('danmakuMounted', listener)

    return () => {
      manager.removeEventListener('danmakuMounted', listener)
    }
  }, [getCanRefresh, refreshComments])

  useEffect(() => {
    manager.updateConfig(options)
  }, [options])

  return <div ref={containerRef}></div>
}
