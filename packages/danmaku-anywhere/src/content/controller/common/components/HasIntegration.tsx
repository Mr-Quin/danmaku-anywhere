import type { ReactNode } from 'react'

import type { IntegrationPolicyItem } from '@/common/options/integrationPolicyStore/schema'
import { useActiveIntegration } from '@/common/options/integrationPolicyStore/useActiveIntegration'

interface HasIntegrationProps {
  fallback?: ReactNode
  children: (integrationPolicy: IntegrationPolicyItem) => ReactNode
}

export const HasIntegration = ({ children, fallback }: HasIntegrationProps) => {
  const integrationPolicy = useActiveIntegration()

  if (!integrationPolicy) return fallback

  return children(integrationPolicy)
}
