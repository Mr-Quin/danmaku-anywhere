import { useEffect, useRef, useState } from 'react'

import { useMouseLocation } from './useMouseLocation'

import { useStore } from '@/content/store/store'

export const useShowFab = () => {
  const playbackStatus = useStore((state) => state.playbackStatus)
  const integration = useStore((state) => state.integration)

  const timeoutRef = useRef<NodeJS.Timeout>()

  const mouseLocation = useMouseLocation()
  const [showFab, setShowFab] = useState(true)

  useEffect(() => {
    if (integration) {
      if (playbackStatus !== 'playing') {
        setShowFab(true)
        return
      }
    }

    setShowFab(true)
    clearTimeout(timeoutRef.current)

    // hide after 3 seconds if no mouse movement
    timeoutRef.current = setTimeout(() => {
      setShowFab(false)
    }, 3000)

    return
  }, [mouseLocation, playbackStatus, integration])

  return showFab
}
