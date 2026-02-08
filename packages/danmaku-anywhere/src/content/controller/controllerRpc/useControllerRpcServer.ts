import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { useInvalidateSeasonAndEpisode } from '@/common/hooks/useInvalidateSeasonAndEpisode'
import { createRpcServer } from '@/common/rpc/server'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'
import { useStore } from '@/content/controller/store/store'
import { useManualDanmaku } from './useManualDanmaku'

export const useControllerRpcServer = () => {
  const { handleUnsetDanmaku, handleSetDanmaku } = useManualDanmaku()

  const invalidateSeasonAndEpisode = useInvalidateSeasonAndEpisode()

  const handleGetDanmakuState = useEventCallback(() => {
    return {
      manual: useStore.getState().danmaku.isManual,
      isMounted: useStore.getState().danmaku.isMounted,
    }
  })

  useEffect(() => {
    const tabRpcServer = createRpcServer<ControllerMethods>({
      ping: async () => true,
      danmakuMount: async (episodes) => {
        const success = await handleSetDanmaku(episodes)
        if (!success) throw new Error('Failed to mount danmaku')
      },
      danmakuUnmount: async () => {
        const success = handleUnsetDanmaku()
        if (!success) throw new Error('Failed to unmount danmaku')
      },
      danmakuGetState: async () => {
        return handleGetDanmakuState() ?? null
      },
      invalidateCache: async () => {
        invalidateSeasonAndEpisode()
      },
    })

    if (!IS_STANDALONE_RUNTIME) {
      tabRpcServer.listen(chrome.runtime.onMessage)

      return () => {
        tabRpcServer.unlisten(chrome.runtime.onMessage)
      }
    }
  }, [handleSetDanmaku, handleUnsetDanmaku, handleGetDanmakuState])

  return null
}
