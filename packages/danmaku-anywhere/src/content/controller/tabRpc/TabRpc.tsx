import { memo } from 'react'
import { useExternalConnection } from '@/content/controller/tabRpc/useExternalConnection'
import { useTabRpcServer } from './useTabRpcServer'

export const TabRpcServer = memo(() => {
  useTabRpcServer()
  useExternalConnection()

  return null
})

TabRpcServer.displayName = 'TabRpcServer'
