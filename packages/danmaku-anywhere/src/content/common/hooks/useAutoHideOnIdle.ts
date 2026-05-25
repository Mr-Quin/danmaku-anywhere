import { useEffect, useRef, useState } from 'react'

const TOUCH_QUERY = '(pointer: coarse)'

function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(
    () => window.matchMedia(TOUCH_QUERY).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(TOUCH_QUERY)
    const handler = (event: MediaQueryListEvent) => {
      setIsTouch(event.matches)
    }
    mq.addEventListener('change', handler)
    return () => {
      mq.removeEventListener('change', handler)
    }
  }, [])

  return isTouch
}

/**
 * Tracks user activity on the window. Returns true while the user is active,
 * flips to false after `idleMs` of inactivity. Stays true on first render
 * until the first activity arms the hide timer.
 */
export function useAutoHideOnIdle(idleMs = 3000): boolean {
  const [visible, setVisible] = useState<boolean>(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const isTouch = useIsTouch()

  useEffect(() => {
    const onActivity = () => {
      setVisible(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setVisible(false)
      }, idleMs)
    }

    if (!isTouch) {
      window.addEventListener('mousemove', onActivity)
    }
    window.addEventListener('touchmove', onActivity, { capture: true })

    return () => {
      clearTimeout(timeoutRef.current)
      if (!isTouch) {
        window.removeEventListener('mousemove', onActivity)
      }
      window.removeEventListener('touchmove', onActivity, { capture: true })
    }
  }, [isTouch, idleMs])

  return visible
}
