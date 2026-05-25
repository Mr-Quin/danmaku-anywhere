import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  createIdleTracker,
  type IdleTracker,
} from '@/content/common/idleTracker'

/**
 * Subscribes to an existing IdleTracker and returns its active state.
 * Use when multiple consumers should share visibility transitions
 * (e.g. density chart and info panel keyed to the same video element).
 */
export function useAutoHideOnIdle(tracker: IdleTracker): boolean {
  return useSyncExternalStore(
    (callback) => tracker.subscribe(callback),
    () => tracker.getActive(),
    () => true
  )
}

/**
 * Convenience hook that owns a window-scoped IdleTracker.
 * For consumers without an existing tracker (e.g. the controller-frame FAB).
 */
export function useWindowIdleTracker(idleMs = 3000): IdleTracker {
  const tracker = useMemo(() => createIdleTracker(window, { idleMs }), [idleMs])
  useEffect(() => {
    return () => {
      tracker.destroy()
    }
  }, [tracker])
  return tracker
}
