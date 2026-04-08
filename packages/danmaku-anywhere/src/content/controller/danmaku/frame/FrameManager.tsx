import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
import { useToast } from '@/common/components/Toast/toastStore'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { uiContainer } from '@/common/ioc/uiIoc'
import { Logger } from '@/common/Logger'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type {
  PlayerRelayEvents,
  VideoInfo,
} from '@/common/rpcClient/background/types'
import { reparentPopover } from '@/content/common/reparentPopover'
import { CONTROLLER_ROOT_ID } from '@/content/controller/common/constants/rootId'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { FrameRegistry } from '@/content/controller/danmaku/frame/FrameRegistry.service'
import { selectBestFrame } from '@/content/controller/danmaku/frame/selectBestFrame'
import { useMigrateDanmaku } from '@/content/controller/danmaku/frame/useMigrateDanmaku'
import { usePreloadNextEpisode } from '@/content/controller/danmaku/frame/usePreloadNextEpisode'
import { useStore } from '@/content/controller/store/store'

const logger = Logger.sub('[FrameManager]')
const frameRegistry = uiContainer.get(FrameRegistry)

export const FrameManager = () => {
  const { toast } = useToast()

  const config = useActiveConfig()
  const { data: extensionOptions } = useExtensionOptions()

  const enableFullscreenInteraction =
    extensionOptions.playerOptions.enableFullscreenInteraction

  const { updateFrame } = useStore.use.frame()

  const unmountDanmaku = useUnmountDanmaku()
  const { preloadNext, canLoadNext } = usePreloadNextEpisode()

  useMigrateDanmaku()

  const reEvaluateActiveFrame = useEventCallback(() => {
    const frame = useStore.getState().frame
    const bestFrameId = selectBestFrame(
      frame.allFrames,
      frame.activeFrame?.frameId
    )
    if (
      bestFrameId !== undefined &&
      bestFrameId !== frame.activeFrame?.frameId
    ) {
      frame.setActiveFrame(bestFrameId)
    }
  })

  const videoChangeHandler = useEventCallback(
    (frameId: number, data: VideoInfo) => {
      const frame = useStore.getState().frame.allFrames.get(frameId)
      updateFrame(frameId, {
        hasVideo: true,
        videoInfo: data,
        videoChangeCount: (frame?.videoChangeCount ?? 0) + 1,
        lastPlayTimestamp: data.playing
          ? Date.now()
          : (frame?.lastPlayTimestamp ?? 0),
      })
      reEvaluateActiveFrame()
    }
  )

  const videoStateChangeHandler = useEventCallback(
    (frameId: number, data: { playing: boolean; muted: boolean }) => {
      const frame = useStore.getState().frame.allFrames.get(frameId)
      if (!frame?.videoInfo) return
      updateFrame(frameId, {
        videoInfo: { ...frame.videoInfo, ...data },
        lastPlayTimestamp: data.playing ? Date.now() : frame.lastPlayTimestamp,
      })
      reEvaluateActiveFrame()
    }
  )

  const videoRemovedHandler = useEventCallback((frameId: number) => {
    const activeFrame = useStore.getState().frame.activeFrame
    if (activeFrame?.frameId === frameId) {
      if (activeFrame.mounted) {
        unmountDanmaku.mutate(frameId)
      }
    }
    updateFrame(frameId, {
      hasVideo: false,
      mounted: false,
      videoInfo: undefined,
    })
    reEvaluateActiveFrame()
  })

  const handlePreloadNext = useEventCallback(async (frameId: number) => {
    const activeFrame = useStore.getState().frame.activeFrame
    if (frameId !== activeFrame?.frameId || !canLoadNext()) {
      return
    }
    try {
      await preloadNext()
    } catch (err) {
      toast.error('Failed to preload next episode: ' + (err as Error).message)
    }
  })

  const handleShowPopover = useEventCallback(() => {
    const root: HTMLDivElement | null = document.querySelector(
      `#${CONTROLLER_ROOT_ID}`
    )
    if (!root) return
    reparentPopover(
      root,
      document,
      enableFullscreenInteraction ? document.fullscreenElement : null
    )
  })

  useEffect(() => {
    const controllerRpcServer = createRpcServer<PlayerRelayEvents>(
      {
        'relay:event:playerReady': async ({ frameId, data }) => {
          frameRegistry.registerFrame({
            frameId,
            url: data.url,
            documentId: data.documentId,
          })

          await playerRpcClient.player['relay:command:start']({
            data: config.mediaQuery,
            frameId,
          })
          updateFrame(frameId, { started: true })
        },
        'relay:event:playerUnload': async ({ frameId }) => {
          frameRegistry.unregisterFrame(frameId)
          reEvaluateActiveFrame()
        },
        'relay:event:videoChange': async ({ frameId, data }) => {
          videoChangeHandler(frameId, data)
        },
        'relay:event:videoRemoved': async ({ frameId }) => {
          videoRemovedHandler(frameId)
        },
        'relay:event:videoStateChange': async ({ frameId, data }) => {
          videoStateChangeHandler(frameId, data)
        },
        'relay:event:preloadNextEpisode': async ({ frameId }) => {
          handlePreloadNext(frameId)
        },
        'relay:event:showPopover': async () => handleShowPopover(),
        'relay:event:userInteraction': async () => {
          window.dispatchEvent(new Event('touchmove'))
        },
      },
      { logger }
    )

    if (!IS_STANDALONE_RUNTIME) {
      controllerRpcServer.listen(chrome.runtime.onMessage)

      return () => {
        controllerRpcServer.unlisten(chrome.runtime.onMessage)
      }
    }
  }, [])

  useEffect(() => {
    // Notify all player scripts that the controller is ready.
    // Players that loaded before the controller will re-send playerReady.
    void playerRpcClient.player['relay:command:controllerReady'](
      { frameId: 0 },
      { optional: true }
    )
  }, [])

  return null
}
