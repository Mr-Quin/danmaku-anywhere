import type { PropsWithChildren, ReactNode } from 'react'
import { useOptionsReadiness } from './useOptionsReadiness'

interface OptionsReadinessGateProps extends PropsWithChildren {
  pending: ReactNode
  failed: ReactNode
}

// Option hooks read storage directly and do not wait for the upgrade, so
// anything that uses them has to render inside this gate.
export function OptionsReadinessGate({
  children,
  pending,
  failed,
}: OptionsReadinessGateProps) {
  const readiness = useOptionsReadiness()

  if (readiness.status === 'ready') {
    return children
  }
  if (readiness.status === 'failed') {
    return failed
  }
  return pending
}
