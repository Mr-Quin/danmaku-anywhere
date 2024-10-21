import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerEvents } from '@/common/rpcClient/background/types'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useInjectFrames } from '@/content/controller/danmaku/frame/useInjectFrames'
import { useStore } from '@/content/controller/store/store'

export const FrameManager = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const resetMediaState = useStore.use.resetMediaState()

  const setHasVideo = useStore.use.setHasVideo()
  const { activeFrame, setActiveFrame, updateFrame } = useStore.use.frame()

  useInjectFrames()

  const videoChangeHandler = useEventCallback((frameId: number) => {
    setHasVideo(true)

    if (activeFrame !== undefined && activeFrame !== frameId) {
      // TODO: handle the case where there are multiple frames with video
      toast.warn(t('danmaku.alert.multipleFrames'))
    } else {
      updateFrame(frameId, { hasVideo: true })
      setActiveFrame(frameId)
    }
  })

  const videoRemovedHandler = useEventCallback((frameId: number) => {
    if (activeFrame === frameId) {
      setHasVideo(false)
      resetMediaState()
    }
  })

  useEffect(() => {
    const controllerRpcServer = createRpcServer<PlayerEvents>(
      {
        ready: async ({ frameId }) => {
          await playerRpcClient.player.start({
            data: config.mediaQuery,
            frameId,
          })
          updateFrame(frameId, { started: true })
        },
        videoChange: async ({ frameId }) => {
          videoChangeHandler(frameId)
        },
        videoRemoved: async ({ frameId }) => {
          videoRemovedHandler(frameId)
        },
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
