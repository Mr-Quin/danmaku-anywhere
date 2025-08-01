import { createContext, useContext } from 'react'

export interface EnvironmentContext {
  environment: string
  type: 'popup' | 'controller'
}

export const EnvironmentContext = createContext<Readonly<EnvironmentContext>>({
  environment: 'development',
  type: 'popup',
})

export const useEnvironmentContext = () => {
  return useContext(EnvironmentContext)
}
