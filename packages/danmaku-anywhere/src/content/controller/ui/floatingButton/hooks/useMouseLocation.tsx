import { useEffect } from 'react'

import { useDebouncedState } from '@/common/hooks/useDebouncedState'

export const useMouseLocation = () => {
  const [mouseLocation, setMouseLocation] = useDebouncedState(
    { x: 0, y: 0 },
    { delay: 100, leading: true }
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseLocation({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return mouseLocation
}
