import type { PropsWithChildren, ReactNode } from 'react'

import { isIntegrationNone } from '@/common/danmaku/types/enums'
import { useStore } from '@/content/store/store'

type HasIntegrationProps = PropsWithChildren & {
  fallback?: ReactNode
}

export const HasIntegration = ({ children, fallback }: HasIntegrationProps) => {
  const integration = useStore((state) => state.integration)

  if (isIntegrationNone(integration)) return fallback

  return children
}
