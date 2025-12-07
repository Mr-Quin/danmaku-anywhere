import { useActivePageContext } from './ActivePageContext'

export const useActiveIntegration = () => {
  const context = useActivePageContext()

  return context.integration
}
