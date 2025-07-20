import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'
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
      danmaku: useStore.getState().danmaku.episodes,
      count: useStore.getState().danmaku.comments.length,
      manual: useStore.getState().danmaku.isManual,
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

    tabRpcServer.listen()

    return () => {
      tabRpcServer.unlisten()
    }
  }, [handleSetDanmaku, handleUnsetDanmaku, handleGetDanmakuState])

  return null
}
