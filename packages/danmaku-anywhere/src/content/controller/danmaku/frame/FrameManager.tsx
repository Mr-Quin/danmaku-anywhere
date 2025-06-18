import { useEventCallback } from '@mui/material'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerEvents } from '@/common/rpcClient/background/types'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useInjectFrames } from '@/content/controller/danmaku/frame/useInjectFrames'
import { useStore } from '@/content/controller/store/store'

export const FrameManager = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const { comments, danmakuLite } = useStore.use.danmaku()

  const setVideoId = useStore.use.setVideoId()
  const { allFrames, activeFrame, setActiveFrame, updateFrame } =
    useStore.use.frame()

  const prevActiveFrameId = useRef<number>(activeFrame?.frameId)

  const { mountDanmaku } = useLoadDanmaku()
  const unmountDanmaku = useUnmountDanmaku()

  useInjectFrames()

  const videoChangeHandler = useEventCallback((frameId: number) => {
    setVideoId(`${frameId}-${Date.now()}`)
    /**
     * If there is an active frame, and it has video,
     * it means there are multiple frames with video.
     *
     * TODO: need some heuristic to handle this case
     */
    if (activeFrame?.hasVideo && activeFrame.frameId !== frameId) {
      toast.warn(t('danmaku.alert.multipleFrames'))
      return
    }

    updateFrame(frameId, { hasVideo: true })
    setActiveFrame(frameId)
  })

  const videoRemovedHandler = useEventCallback((frameId: number) => {
    // Reset state if video is removed from the active frame,
    // but keep the current active frame even when the video is removed
    if (activeFrame?.frameId === frameId) {
      setVideoId(undefined)
      if (activeFrame.mounted) {
        unmountDanmaku.mutate(frameId)
      }
    }
    updateFrame(frameId, { hasVideo: false, mounted: false })
  })

  useEffect(() => {
    if (!activeFrame) {
      prevActiveFrameId.current = undefined
      return
    }

    if (activeFrame.frameId === prevActiveFrameId.current) return

    /**
     * If the active frame changes, "migrate" danmaku to the new frame if there are comments
     *
     * If the previous active frame is mounted, unmount the danmaku,
     * then mount it to the new active frame
     */
    if (
      prevActiveFrameId.current &&
      allFrames.get(prevActiveFrameId.current)?.mounted
    ) {
      unmountDanmaku.mutate(prevActiveFrameId.current)
    }

    if (comments.length && danmakuLite) {
      mountDanmaku({ ...danmakuLite, comments })
    }

    prevActiveFrameId.current = activeFrame.frameId
  }, [activeFrame])

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
