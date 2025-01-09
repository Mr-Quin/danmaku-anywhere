import { useEffect, useMemo, useRef, useState } from 'react'

import { useIsTouchDevice } from '@/content/controller/common/hooks/useIsTouchDevice'

export const useShowFab = () => {
  const timeoutRef = useRef<NodeJS.Timeout>(undefined)

  const isTouch = useIsTouchDevice()
  const [showFab, setShowFab] = useState(true)

  const handleShowFab = useMemo(() => {
    return () => {
      setShowFab(true)
      clearTimeout(timeoutRef.current)

      // hide after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setShowFab(false)
      }, 3000)
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = () => {
      handleShowFab()
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useEffect(() => {
    if (!isTouch) return

    const handleTouchStart = () => {
      handleShowFab()
    }

    window.addEventListener('touchstart', handleTouchStart)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [isTouch])

  return showFab
}
