import type { ReactNode } from 'react'

import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'

interface HasIntegrationProps {
  fallback?: ReactNode
  children: (integrationPolicy: Integration) => ReactNode
}

export const HasIntegration = ({ children, fallback }: HasIntegrationProps) => {
  const integrationPolicy = useActiveIntegration()

  if (!integrationPolicy) return fallback

  return children(integrationPolicy)
}
