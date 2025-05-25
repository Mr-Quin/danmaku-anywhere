import { createContext, useContext } from 'react'

export type Environment = {
  isPopup: boolean
}

export const environment = createContext<Environment>({
  isPopup: false,
})

export const useEnvironment = () => {
  return useContext(environment)
}
