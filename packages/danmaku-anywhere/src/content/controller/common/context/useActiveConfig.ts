import { useActivePageContext } from '@/content/controller/common/context/ActivePageContext'

export const useActiveConfig = () => {
  const { config } = useActivePageContext()

  return config
}
