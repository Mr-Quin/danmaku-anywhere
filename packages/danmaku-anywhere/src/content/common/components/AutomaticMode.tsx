import type { PropsWithChildren, ReactNode } from 'react'

import { useStore } from '@/content/store/store'

type AutomaticModeProps = PropsWithChildren & {
  fallback?: ReactNode
}

export const AutomaticMode = ({ children, fallback }: AutomaticModeProps) => {
  const manual = useStore((state) => state.manual)

  if (manual) return fallback

  return children
}
