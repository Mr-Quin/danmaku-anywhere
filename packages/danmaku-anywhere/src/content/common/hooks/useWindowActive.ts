import { useEffect, useState } from 'react'
import { IdleTracker } from '@/content/common/idleTracker'

/**
 * Owns a window-scoped IdleTracker and returns whether the user is active. The
 * tracker is created inside the effect so its listeners attach and tear down
 * symmetrically under React.StrictMode's mount/unmount/remount.
 */
export function useWindowActive(idleMs = 3000): boolean {
  const [active, setActive] = useState(true)

  useEffect(() => {
    const tracker = new IdleTracker(window, { idleMs })
    setActive(tracker.getActive())
    const unsubscribe = tracker.subscribe(setActive)
    return () => {
      unsubscribe()
      tracker.destroy()
    }
  }, [idleMs])

  return active
}
