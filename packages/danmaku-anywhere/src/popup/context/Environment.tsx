import { type ReactNode, createContext, useContext, useMemo } from 'react'

export type Environment = {
  isPopup: boolean
}

const environment = createContext<Environment>({
  isPopup: false,
})

type EnvironmentProviderProps = {
  isPopup: boolean
  children: ReactNode
}

export const EnvironmentProvider = ({
  isPopup,
  children,
}: EnvironmentProviderProps) => {
  const value = useMemo(() => {
    return {
      isPopup,
    }
  }, [isPopup])

  return <environment.Provider value={value}>{children}</environment.Provider>
}

export const useEnvironment = () => {
  return useContext(environment)
}
