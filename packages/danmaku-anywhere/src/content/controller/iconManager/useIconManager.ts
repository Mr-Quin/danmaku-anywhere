import { useEffect } from 'react'

import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useStore } from '@/content/controller/store/store'

export const useIconManager = () => {
  const config = useActiveConfig()
  const hasComments = useStore((state) => state.hasComments)
  const comments = useStore((state) => state.comments)

  useEffect(() => {
    if (hasComments)
      return void chromeRpcClient.iconSet({
        state: 'active',
        count: comments.length,
      })
    if (config) return void chromeRpcClient.iconSet({ state: 'available' })
  }, [config, hasComments])
}
