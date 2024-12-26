import { useEffect, useRef, useState } from 'react'

import { useMouseLocation } from './useMouseLocation'

export const useShowFab = () => {
  const timeoutRef = useRef<NodeJS.Timeout>()

  const mouseLocation = useMouseLocation()
  const [showFab, setShowFab] = useState(true)

  useEffect(() => {
    setShowFab(true)
    clearTimeout(timeoutRef.current)

    // hide after 3 seconds if no mouse movement
    timeoutRef.current = setTimeout(() => {
      setShowFab(false)
    }, 3000)

    return
  }, [mouseLocation])

  return showFab
}
