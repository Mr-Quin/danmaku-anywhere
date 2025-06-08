import { useEffect, useMemo, useRef, useState } from 'react'

import { useIsTouchDevice } from '@/content/controller/common/hooks/useIsTouchDevice'

type UseMouseDelayProps = {
  enabled?: boolean
  timeout?: number
}

export const useMouseDelay = ({
  enabled = true,
  timeout = 3000,
}: UseMouseDelayProps = {}) => {
  const timeoutRef = useRef<NodeJS.Timeout>(undefined)

  const isTouch = useIsTouchDevice()
  const [show, setShow] = useState(true)

  const handleShow = useMemo(() => {
    return () => {
      setShow(true)
      clearTimeout(timeoutRef.current)

      // hide after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setShow(false)
      }, timeout)
    }
  }, [timeout])

  useEffect(() => {
    if (!enabled) return

    const handleTouch: EventListener = () => {
      handleShow()
    }

    if (!isTouch) {
      window.addEventListener('mousemove', handleTouch)
    }
    window.addEventListener('touchmove', handleTouch, { capture: true })

    return () => {
      if (!isTouch) {
        window.removeEventListener('mousemove', handleTouch)
      }
      window.removeEventListener('touchmove', handleTouch, { capture: true })
    }
  }, [handleShow, enabled, isTouch])

  return show
}
