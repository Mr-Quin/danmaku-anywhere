import type { PropsWithChildren } from 'react'
import { createContext, useContext, useMemo } from 'react'

const context = createContext<chrome.runtime.Port>(chrome.runtime.connect())

export const PortProvider = ({ children }: PropsWithChildren) => {
  const port = useMemo(() => chrome.runtime.connect(), [])

  return <context.Provider value={port}>{children}</context.Provider>
}

export const usePort = () => {
  return useContext(context)
}
