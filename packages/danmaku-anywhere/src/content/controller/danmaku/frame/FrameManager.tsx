import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerRelayEvents } from '@/common/rpcClient/background/types'
import { CONTROLLER_ROOT_ID } from '@/content/controller/common/constants/rootId'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useInjectFrames } from '@/content/controller/danmaku/frame/useInjectFrames'
import { useMigrateDanmaku } from '@/content/controller/danmaku/frame/useMigrateDanmaku'
import { usePreloadNextEpisode } from '@/content/controller/danmaku/frame/usePreloadNextEpisode'
import { useStore } from '@/content/controller/store/store'

export const FrameManager = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()

  const setVideoId = useStore.use.setVideoId()
  const { activeFrame, setActiveFrame, updateFrame } = useStore.use.frame()

  const unmountDanmaku = useUnmountDanmaku()
  const { preloadNext, canLoadNext } = usePreloadNextEpisode()

  useInjectFrames()
  useMigrateDanmaku()

  const videoChangeHandler = useEventCallback((frameId: number) => {
    setVideoId(`${frameId}-${Date.now()}`)
    /**
     * If there is already an active frame, and it has video,
     * it means there are multiple frames with video.
     *
     * TODO: need some heuristic to handle this case
     */
    if (activeFrame?.hasVideo && activeFrame.frameId !== frameId) {
      toast.warn(
        t('danmaku.alert.multipleFrames', 'Multiple frames with video detected')
      )
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

  const handlePreloadNext = useEventCallback((frameId: number) => {
    if (frameId !== activeFrame?.frameId || !canLoadNext()) {
      return
    }
    preloadNext.mutate(undefined, {
      onError: (err) => {
        toast.error('Failed to preload next episode: ' + err.message)
      },
    })
  })

  useEffect(() => {
    const controllerRpcServer = createRpcServer<PlayerRelayEvents>(
      {
        'relay:event:playerReady': async ({ frameId }) => {
          await playerRpcClient.player['relay:command:start']({
            data: config.mediaQuery,
            frameId,
          })
          updateFrame(frameId, { started: true })
        },
        'relay:event:videoChange': async ({ frameId }) => {
          videoChangeHandler(frameId)
        },
        'relay:event:videoRemoved': async ({ frameId }) => {
          videoRemovedHandler(frameId)
        },
        'relay:event:preloadNextEpisode': async ({ frameId }) => {
          handlePreloadNext(frameId)
        },
        'relay:event:showPopover': async () => {
          const root: HTMLDivElement | null = document.querySelector(
            `#${CONTROLLER_ROOT_ID}`
          )
          if (root) {
            root.hidePopover()
            root.showPopover()
          }
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
