import { useMemo } from 'react'

import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'

export const useMatchIntegrationPolicy = (id?: string) => {
  const { get } = useIntegrationPolicyStore()

  return useMemo(() => {
    if (!id) return
    return get(id)
  }, [id, get])
}
