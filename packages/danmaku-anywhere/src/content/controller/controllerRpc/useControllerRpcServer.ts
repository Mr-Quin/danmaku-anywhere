import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
import { createRpcServer } from '@/common/rpc/server'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'
import { useStore } from '@/content/controller/store/store'
import { useManualDanmaku } from './useManualDanmaku'

export const useControllerRpcServer = () => {
  const { handleUnsetDanmaku, handleSetDanmaku } = useManualDanmaku()

  const handleGetDanmakuState = useEventCallback(() => {
    return {
      danmaku: useStore.getState().danmaku.danmakuLite,
      count: useStore.getState().danmaku.comments.length,
      manual: useStore.getState().danmaku.isManual,
    }
  })

  useEffect(() => {
    const tabRpcServer = createRpcServer<ControllerMethods>({
      ping: async () => true,
      danmakuMount: async (danmaku) => {
        const success = await handleSetDanmaku(danmaku)
        if (!success) throw new Error('Failed to mount danmaku')
      },
      danmakuUnmount: async () => {
        const success = handleUnsetDanmaku()
        if (!success) throw new Error('Failed to unmount danmaku')
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
