import { useActivePageContext } from '@/content/controller/common/context/ActivePageContext'

export const useActiveConfig = () => {
  const context = useActivePageContext()

  return context.config
}
