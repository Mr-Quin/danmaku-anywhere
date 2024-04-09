import type { PropsWithChildren } from 'react'

import { useStore } from '@/content/store/store'

export const ManualMode = ({ children }: PropsWithChildren) => {
  const manual = useStore((state) => state.manual)

  if (manual) return children

  return null
}
