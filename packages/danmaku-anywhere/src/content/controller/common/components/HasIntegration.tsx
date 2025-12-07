import type { ReactNode } from 'react'

import type { MountConfig } from '@/common/options/mountConfig/schema'
import { useActiveConfig } from '../hooks/useActiveConfig'

interface HasIntegrationProps {
  fallback?: ReactNode
  children: (config: MountConfig) => ReactNode
}

export const HasIntegration = ({ children, fallback }: HasIntegrationProps) => {
  const activeConfig = useActiveConfig()

  if (!activeConfig) {
    return fallback
  }

  return children(activeConfig)
}
