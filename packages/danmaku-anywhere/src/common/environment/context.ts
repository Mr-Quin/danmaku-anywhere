import { createContext, useContext } from 'react'

export type EnvironmentType = 'popup' | 'controller'

export interface EnvironmentContext {
  environment: string
  type: EnvironmentType
}

export const EnvironmentContext = createContext<Readonly<EnvironmentContext>>({
  environment: 'development',
  type: 'popup',
})

export const useEnvironmentContext = () => {
  return useContext(EnvironmentContext)
}
