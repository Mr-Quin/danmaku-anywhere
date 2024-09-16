import { useMatchIntegrationPolicy } from '@/common/options/integrationPolicyStore/useMatchIntegrationPolicy'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'

export const useActiveIntegration = () => {
  const config = useActiveConfig()

  return useMatchIntegrationPolicy(config?.integration)
}
