import type { PropsWithChildren, ReactNode } from 'react'

import { useStore } from '@/content/store/store'

type ManualModeProps = PropsWithChildren & {
  fallback?: ReactNode
}

export const ManualMode = ({ children, fallback }: ManualModeProps) => {
  const manual = useStore((state) => state.manual)

  if (manual) return children

  return fallback
}
