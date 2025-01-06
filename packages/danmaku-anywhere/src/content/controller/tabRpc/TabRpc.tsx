import { memo } from 'react'

import { useTabRpcServer } from './useTabRpcServer'

import { useExternalConnection } from '@/content/controller/tabRpc/useExternalConnection'

export const TabRpcServer = memo(() => {
  useTabRpcServer()
  useExternalConnection()

  return null
})

TabRpcServer.displayName = 'TabRpcServer'
