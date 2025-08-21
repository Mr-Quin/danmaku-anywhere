import { useEffect } from 'react'

import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useStore } from '@/content/controller/store/store'

export const useIconManager = () => {
  const config = useActiveConfig()
  const { isMounted, comments } = useStore.use.danmaku()

  useEffect(() => {
    if (isMounted)
      return void chromeRpcClient.iconSet({
        state: 'active',
        count: comments.length,
      })
    if (config) {
      return void chromeRpcClient.iconSet({ state: 'available' })
    }
  }, [config, isMounted])
}
