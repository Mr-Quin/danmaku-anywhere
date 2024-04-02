import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo } from 'react'

import { Logger } from '../services/Logger'

const context = createContext<chrome.runtime.Port>(chrome.runtime.connect())

export const PortProvider = ({ children }: PropsWithChildren) => {
  const port = useMemo(() => chrome.runtime.connect(), [])

  useEffect(() => {
    port.onDisconnect.addListener(() => {
      Logger.warn('Port disconnected')
    })
  }, [])

  return <context.Provider value={port}>{children}</context.Provider>
}

export const usePort = () => {
  return useContext(context)
}
