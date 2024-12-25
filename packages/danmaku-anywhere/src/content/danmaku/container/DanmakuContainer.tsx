import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerEvents } from '@/common/rpcClient/background/types'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'
import { useFrames } from '@/content/danmaku/container/useFrames'
import { useStore } from '@/content/store/store'

export const DanmakuContainer = () => {
  const { data: options } = useDanmakuOptions()

  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const resetMediaState = useStore.use.resetMediaState()

  const { getCanRefresh, refreshComments } = useRefreshComments()

  const setHasVideo = useStore.use.setHasVideo()
  const activeFrame = useStore.use.activeFrame()
  const allFrames = useStore.use.allFrames()
  const setActiveFrame = useStore.use.setActiveFrame()
  const addFrame = useStore.use.addFrame()
  const removeFrame = useStore.use.removeFrame()

  const containerRef = useRef<HTMLDivElement>(null)

  const frames = useFrames()

  useEffect(() => {}, [allFrames])

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

    const controllerRpcServer = createRpcServer<PlayerEvents>(
      {
        onReady: async (frameId) => {
          addFrame(frameId)
          // const res = await playerRpcClient.player.start({
          //   data: config.mediaQuery,
          // })
          // Logger.debug('Manager started', res)
        },
        onVideoChange: async () => {
          videoChangeHandler()
        },
        onVideoRemoved: async () => {
          videoRemovedHandler()
        },
      },
      { logger: Logger.sub('[Controller]') }
    )

    controllerRpcServer.listen()

    return () => {
      clearTimeout(timeout)

      controllerRpcServer.unlisten()
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

    // manager.addEventListener('danmakuMounted', listener)

    return () => {
      // manager.removeEventListener('danmakuMounted', listener)
    }
  }, [getCanRefresh, refreshComments])

  useEffect(() => {
    // manager.updateConfig(options)
  }, [options])

  return <div ref={containerRef}></div>
}
