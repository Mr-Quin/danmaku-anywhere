import { createContext, type PropsWithChildren, use, useMemo } from 'react'

import type { MountConfig } from '@/common/options/mountConfig/schema'

export interface ActivePageContextValue {
  config: MountConfig
}

const ActivePageContext = createContext<ActivePageContextValue | null>(null)

export const ActivePageProvider = ({
  children,
  config,
}: PropsWithChildren<ActivePageContextValue>) => {
  const value = useMemo(() => {
    return { config }
  }, [config])

  return (
    <ActivePageContext.Provider value={value}>
      {children}
    </ActivePageContext.Provider>
  )
}

export const useActivePageContext = () => {
  const context = use(ActivePageContext)

  if (!context) {
    throw new Error(
      'useActivePageContext must be used within an ActivePageProvider'
    )
  }

  return context
}
