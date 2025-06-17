import { type ReactNode, createContext, useContext, useMemo } from 'react'

type EnvType = 'popup' | 'dashboard' | 'content'

export type Environment = {
  env: EnvType
  isPopup: boolean
}

const environment = createContext<Environment>({
  isPopup: false,
  env: 'popup',
})

type EnvironmentProviderProps = {
  env: EnvType
  children: ReactNode
}

export const EnvironmentProvider = ({
  env,
  children,
}: EnvironmentProviderProps) => {
  const value = useMemo(() => {
    return {
      isPopup: env === 'popup',
      env,
    }
  }, [env])

  return <environment.Provider value={value}>{children}</environment.Provider>
}

export const useEnvironment = () => {
  return useContext(environment)
}
