import { memo } from 'react'

import { useTabRpcServer } from './useTabRpcServer'

export const TabRpcServer = memo(() => {
  useTabRpcServer()

  return null
})

TabRpcServer.displayName = 'TabRpcServer'
