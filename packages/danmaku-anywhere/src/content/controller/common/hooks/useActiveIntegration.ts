import { useMemo } from 'react'

import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'

export const useActiveIntegration = () => {
  const config = useActiveConfig()

  const { get } = useIntegrationPolicyStore()

  return useMemo(() => {
    if (!config?.integration) return
    return get(config?.integration)
  }, [config?.integration, get])
}
