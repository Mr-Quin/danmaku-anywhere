import { useEffect } from 'react'

import { chromeRpcClient } from '@/common/rpc/client'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'

export const useIconManager = () => {
  const config = useActiveConfig()

  useEffect(() => {
    if (config) {
      chromeRpcClient.iconSet('available')
    } else {
      chromeRpcClient.iconSet('unavailable')
    }
  }, [config])
}
