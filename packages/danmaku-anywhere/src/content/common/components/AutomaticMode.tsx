import type { PropsWithChildren } from 'react'

import { useStore } from '@/content/store/store'

export const AutomaticMode = ({ children }: PropsWithChildren) => {
  const manual = useStore((state) => state.manual)

  if (manual) return null

  return children
}
