import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerEvents } from '@/common/rpcClient/background/types'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useInjectFrames } from '@/content/controller/danmaku/container/useInjectFrames'
import { useStore } from '@/content/controller/store/store'

export const DanmakuContainer = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const resetMediaState = useStore.use.resetMediaState()

  const setHasVideo = useStore.use.setHasVideo()
  const {
    activeFrame,
    allFrames,
    addFrame,
    setActiveFrame,
    removeFrame,
    updateFrame,
  } = useStore.use.frame()

  useInjectFrames({
    onFrameRemoved: (frameId) => {
      console.debug('FRAME REMOVED', frameId)
      removeFrame(frameId)
    },
  })

  const videoChangeHandler = useEventCallback((frameId: number) => {
    setHasVideo(true)

    if (activeFrame !== undefined && activeFrame !== frameId) {
      toast.warn(t('danmaku.alert.multipleVideos'))
    }

    updateFrame(frameId, { hasVideo: true })
    setActiveFrame(frameId)
  })

  const videoRemovedHandler = useEventCallback((frameId: number) => {
    if (activeFrame === frameId) {
      setHasVideo(false)
      resetMediaState()
    }
  })

  useEffect(() => {
    // Start the player in all frames that haven't started yet
    allFrames.forEach(async (frame) => {
      if (!frame.started) {
        await playerRpcClient.player.start({
          data: config.mediaQuery,
          frameId: frame.frameId,
        })
        updateFrame(frame.frameId, { started: true })
      }
    })
  }, [allFrames])

  useEffect(() => {
    const controllerRpcServer = createRpcServer<PlayerEvents>(
      {
        ready: async ({ frameId }) => {
          addFrame(frameId)
        },
        videoChange: async ({ frameId }) => {
          videoChangeHandler(frameId)
        },
        videoRemoved: async ({ frameId }) => {
          videoRemovedHandler(frameId)
        },
        danmakuMounted: async ({ data: comments }) => {},
      },
      { logger: Logger.sub('[Controller]') }
    )

    controllerRpcServer.listen()

    return () => {
      controllerRpcServer.unlisten()
    }
  }, [])

  return null
}
