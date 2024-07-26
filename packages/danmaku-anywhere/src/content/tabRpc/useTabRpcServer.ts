import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'

import { useManualDanmaku } from './useManualDanmaku'

import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import type { TabMethods } from '@/common/rpcClient/tab/types'
import { useStore } from '@/content/store/store'

export const useTabRpcServer = () => {
  const { handleUnsetDanmaku, handleSetDanmaku } = useManualDanmaku()

  const handleGetDanmakuState = useEventCallback(() => {
    return {
      meta: useStore.getState().danmakuMeta,
      count: useStore.getState().comments.length,
      manual: useStore.getState().manual,
    }
  })

  useEffect(() => {
    const tabRpcServer = createRpcServer<TabMethods>({
      ping: async () => true,
      danmakuMount: async ({ meta, comments }) => {
        handleSetDanmaku(meta, comments)
      },
      danmakuUnmount: async () => {
        handleUnsetDanmaku()
      },
      danmakuGetState: async () => {
        return handleGetDanmakuState() ?? null
      },
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      tabRpcServer
        .onMessage(message, sender)
        .then(sendResponse)
        .catch(Logger.debug)
      return true
    })

    return () => {
      chrome.runtime.onMessage.removeListener(tabRpcServer.onMessage)
    }
  }, [handleSetDanmaku, handleUnsetDanmaku, handleGetDanmakuState])

  return null
}
