import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import type { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'

import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import type { TabMethods } from '@/common/rpc/interface/tab'
import { createRpcServer } from '@/common/rpc/server'
import { Logger } from '@/common/services/Logger'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = (
  danmakuEngine: DanmakuManager,
  videoNode: HTMLVideoElement | null,
  container: HTMLElement | null
) => {
  const { data: options } = useDanmakuOptions()

  const handleSetDanmaku = useEventCallback((comments: DanDanComment[]) => {
    if (!container || !videoNode) {
      Logger.debug('Container or node is not ready')
      return
    }

    Logger.debug('Creating danmaku')

    danmakuEngine.create(container, videoNode, comments, options)
  })

  const handleUnsetDanmaku = useEventCallback(() => {
    if (!danmakuEngine.created) {
      Logger.debug('Danmaku is not created')
      return
    }

    Logger.debug(`Unloading danmaku`)
    danmakuEngine.destroy()
  })

  useEffect(() => {
    const tabRPCServer = createRpcServer<TabMethods>({
      danmakuMount: async (comments) => {
        handleSetDanmaku(comments)
      },
      danmakuUnmount: async () => {
        handleUnsetDanmaku()
      },
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      tabRPCServer.onMessage(message, sender).then(sendResponse)
      return true
    })

    return () => {
      chrome.runtime.onMessage.removeListener(tabRPCServer.onMessage)
    }
  }, [handleSetDanmaku, handleUnsetDanmaku])

  return null
}
