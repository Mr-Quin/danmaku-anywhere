import { useEffect } from 'react'

import { useActiveConfig } from '../hooks/useActiveConfig'

import { chromeRpcClient } from '@/common/rpc/client'

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
