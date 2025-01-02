import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'

import { useManualDanmaku } from './useManualDanmaku'

import { createRpcServer } from '@/common/rpc/server'
import type { TabMethods } from '@/common/rpcClient/tab/types'
import { useStore } from '@/content/controller/store/store'

export const useTabRpcServer = () => {
  const { handleUnsetDanmaku, handleSetDanmaku } = useManualDanmaku()

  const handleGetDanmakuState = useEventCallback(() => {
    return {
      danmaku: useStore.getState().danmakuLite,
      count: useStore.getState().comments.length,
      manual: useStore.getState().manual,
    }
  })

  useEffect(() => {
    const tabRpcServer = createRpcServer<TabMethods>({
      ping: async () => true,
      danmakuMount: async (danmaku) => {
        handleSetDanmaku(danmaku)
      },
      danmakuUnmount: async () => {
        handleUnsetDanmaku()
      },
      danmakuGetState: async () => {
        return handleGetDanmakuState() ?? null
      },
    })

    tabRpcServer.listen()

    return () => {
      tabRpcServer.unlisten()
    }
  }, [handleSetDanmaku, handleUnsetDanmaku, handleGetDanmakuState])

  return null
}
