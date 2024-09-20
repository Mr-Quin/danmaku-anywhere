import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'
import { useDanmakuManager } from '@/content/store/danmakuManager'
import { useStore } from '@/content/store/store'

export const DanmakuContainer = () => {
  const { data: options } = useDanmakuOptions()

  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const { comments, hasComments, resetMediaState } = useStore(
    useShallow(({ comments, hasComments, resetMediaState }) => {
      return { comments, hasComments, resetMediaState }
    })
  )
  const { canRefresh, refreshComments } = useRefreshComments()

  const setHasVideo = useStore.use.setHasVideo()
  const manager = useDanmakuManager.use.manager()

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    manager.addEventListener('videoChange', () => {
      clearTimeout(timeout)
      setHasVideo(true)
    })
    manager.addEventListener('videoRemoved', () => {
      // Delay setting hasVideo to false to prevent flickering
      timeout = setTimeout(() => {
        setHasVideo(false)
      }, 1000)

      resetMediaState()
    })

    manager.start(config.mediaQuery)

    return () => {
      clearTimeout(timeout)
      manager.destroy()
    }
  }, [manager])

  useEffect(() => {
    const listener = (comments: CommentEntity[]) => {
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
    }

    manager.addEventListener('danmakuMounted', listener)

    return () => {
      manager.removeEventListener('danmakuMounted', listener)
    }
  }, [canRefresh, refreshComments])

  useEffect(() => {
    if (hasComments) {
      manager.render(containerRef.current!)
      manager.mount(comments)
    }
  }, [hasComments, manager])

  useEffect(() => {
    manager.updateConfig(options)
  }, [options, manager])

  return <div ref={containerRef}></div>
}
