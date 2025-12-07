import { createContext, type PropsWithChildren, use, useMemo } from 'react'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import type { MountConfig } from '@/common/options/mountConfig/schema'

interface ActivePageContextValue {
  config: MountConfig
  integration: Integration | undefined
}

interface ActivePageProviderProps extends PropsWithChildren {
  config: MountConfig
}

const ActivePageContext = createContext<ActivePageContextValue | null>(null)

export const ActivePageProvider = ({
  children,
  config,
}: ActivePageProviderProps) => {
  const { get } = useIntegrationPolicyStore()

  const value = useMemo<ActivePageContextValue>(() => {
    const integration = config.integration ? get(config.integration) : undefined

    return { config, integration }
  }, [config, get])

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
