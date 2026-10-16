import { useCallback, useSyncExternalStore } from 'react'
import { useInjectService } from '@/common/hooks/useInjectService'
import { ReadinessService, type ReadinessState } from './ReadinessService'

export function useOptionsReadiness(): ReadinessState {
  const readiness = useInjectService(ReadinessService)
  const subscribe = useCallback(
    (listener: () => void) => {
      return readiness.subscribe(listener)
    },
    [readiness]
  )
  const getState = useCallback(() => {
    return readiness.getState()
  }, [readiness])
  return useSyncExternalStore(subscribe, getState)
}
