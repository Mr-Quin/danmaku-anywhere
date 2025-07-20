import { memo } from 'react'
import { useControllerRpcServer } from './useControllerRpcServer'
import { useExternalConnection } from './useExternalConnection'

export const ControllerRpcServer = memo(() => {
  useControllerRpcServer()
  useExternalConnection()

  return null
})

ControllerRpcServer.displayName = 'ControllerRpcServer'
