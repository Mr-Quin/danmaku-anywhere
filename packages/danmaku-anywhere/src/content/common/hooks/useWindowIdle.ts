import { useEffect, useState } from 'react'
import { createIdleTracker } from '@/content/common/idleTracker'

/**
 * Owns a window-scoped IdleTracker and returns whether the user is currently
 * active. The tracker is created inside an effect so its window listeners are
 * attached and torn down symmetrically, which keeps it correct under
 * React.StrictMode's mount/unmount/remount cycle.
 */
export function useWindowIdle(idleMs = 3000): boolean {
  const [active, setActive] = useState(true)

  useEffect(() => {
    const tracker = createIdleTracker(window, { idleMs })
    setActive(tracker.getActive())
    const unsubscribe = tracker.subscribe(setActive)
    return () => {
      unsubscribe()
      tracker.destroy()
    }
  }, [idleMs])

  return active
}
