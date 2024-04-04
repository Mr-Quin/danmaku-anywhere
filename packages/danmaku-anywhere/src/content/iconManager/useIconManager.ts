import { useEffect } from 'react'

import type { MountConfig } from '@/common/constants/mountConfig'
import { chromeRpcClient } from '@/common/rpc/client'

export const useIconManager = (config: MountConfig) => {
  useEffect(() => {
    if (config) {
      chromeRpcClient.iconSet('available')
    } else {
      chromeRpcClient.iconSet('unavailable')
    }
  }, [config])
}
