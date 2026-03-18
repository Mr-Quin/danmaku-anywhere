import { useEventCallback } from '@mui/material'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { uiContainer } from '@/common/ioc/uiIoc'
import { Logger } from '@/common/Logger'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerRelayEvents } from '@/common/rpcClient/background/types'
import { reparentPopover } from '@/content/common/reparentPopover'
import { CONTROLLER_ROOT_ID } from '@/content/controller/common/constants/rootId'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { FrameRegistry } from '@/content/controller/danmaku/frame/FrameRegistry.service'
import { useMigrateDanmaku } from '@/content/controller/danmaku/frame/useMigrateDanmaku'
import { usePreloadNextEpisode } from '@/content/controller/danmaku/frame/usePreloadNextEpisode'
import { useStore } from '@/content/controller/store/store'

const logger = Logger.sub('[FrameManager]')
const frameRegistry = uiContainer.get(FrameRegistry)

export const FrameManager = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const config = useActiveConfig()
  const { data: extensionOptions } = useExtensionOptions()

  const enableFullscreenInteraction =
    extensionOptions.playerOptions.enableFullscreenInteraction

  const enableFullscreenInteractionRef = useRef(enableFullscreenInteraction)
  enableFullscreenInteractionRef.current = enableFullscreenInteraction

  const setVideoId = useStore.use.setVideoId()
  const { activeFrame, updateFrame } = useStore.use.frame()

  const unmountDanmaku = useUnmountDanmaku()
  const { preloadNext, canLoadNext } = usePreloadNextEpisode()

  useMigrateDanmaku()

  const videoChangeHandler = useEventCallback(
    (frameId: number, data: { src: string; width: number; height: number }) => {
      setVideoId(`${frameId}-${Date.now()}`)

      if (activeFrame?.hasVideo && activeFrame.frameId !== frameId) {
        toast.warn(
          t(
            'danmaku.alert.multipleFrames',
            'Multiple frames with video detected'
          )
        )
        return
      }

      updateFrame(frameId, { hasVideo: true, videoInfo: data })
      useStore.getState().frame.setActiveFrame(frameId)
    }
  )

  const videoRemovedHandler = useEventCallback((frameId: number) => {
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
        'relay:event:playerReady': async ({ frameId, data }) => {
          frameRegistry.registerFrame({
            frameId,
            url: data.url,
            documentId: data.documentId,
          })
          frameRegistry.ensureActiveFrame(frameId)

          await playerRpcClient.player['relay:command:start']({
            data: config.mediaQuery,
            frameId,
          })
          updateFrame(frameId, { started: true })
        },
        'relay:event:playerUnload': async ({ frameId }) => {
          frameRegistry.unregisterFrame(frameId)
        },
        'relay:event:videoChange': async ({ frameId, data }) => {
          videoChangeHandler(frameId, data)
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
          if (!root) return

          if (enableFullscreenInteractionRef.current) {
            reparentPopover(root, document, document.fullscreenElement)
          } else {
            reparentPopover(root, document, null)
          }
        },
      },
      { logger }
    )

    if (!IS_STANDALONE_RUNTIME) {
      controllerRpcServer.listen(chrome.runtime.onMessage)

      // Notify all player scripts that the controller is ready.
      // Players that loaded before the controller will re-send playerReady.
      void playerRpcClient.player['relay:command:controllerReady'](
        { frameId: 0 },
        { optional: true }
      )

      return () => {
        controllerRpcServer.unlisten(chrome.runtime.onMessage)
      }
    }
  }, [])

  return null
}
