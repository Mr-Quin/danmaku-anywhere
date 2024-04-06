import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'
import type { FabProps } from '@mui/material'
import { Fab, Slide, useEventCallback } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { LoadingRing } from './LoadingRing'

import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useStore } from '@/content/store/store'

interface HiddenFabProps extends FabProps {
  onOpen: () => void
  isOpen: boolean
}

const useDebouncedState = <T,>(initialValue: T, delay = 300) => {
  const [value, setValue] = useState(initialValue)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSetState = useEventCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setValue(newValue)
    }, delay)
  })

  return [value, debouncedSetState] as const
}

const useMouseLocation = () => {
  const [mouseLocation, setMouseLocation] = useDebouncedState(
    { x: 0, y: 0 },
    100
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

const getDistance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

export const HiddenFab = ({ onOpen, isOpen, ...rest }: HiddenFabProps) => {
  const isLoading = useAnyLoading()
  const playbackStatus = useStore((state) => state.playbackStatus)
  const manual = useStore((state) => state.manual)

  const fabRef = useRef<HTMLButtonElement>(null)

  const mouseLocation = useMouseLocation()

  const [showFab, setShowFab] = useState(true)

  useEffect(() => {
    if (!fabRef.current) return
    if (!manual) {
      if (playbackStatus !== 'playing') {
        setShowFab(true)
        return
      }
    }

    const position = fabRef.current.getBoundingClientRect()

    const isClose =
      getDistance(
        mouseLocation.x,
        mouseLocation.y,
        position.x + position.width / 2,
        position.y + position.height / 2
      ) < 100

    setShowFab(isClose)
  }, [mouseLocation, playbackStatus, manual])

  return (
    <Slide direction="right" in={isLoading || showFab}>
      <Fab
        color="primary"
        aria-label="Add"
        onClick={onOpen}
        ref={fabRef}
        {...rest}
      >
        <LoadingRing isLoading={isLoading} />
        {isOpen ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </Fab>
    </Slide>
  )
}
