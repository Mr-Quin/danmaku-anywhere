import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'
import type { FabProps } from '@mui/material'
import { Fab, Zoom, useEventCallback } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { LoadingRing } from './LoadingRing'

import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useStore } from '@/content/store/store'

interface HiddenFabProps extends FabProps {
  onOpen: () => void
  isOpen: boolean
}

interface UseDebouncedStateOptions {
  delay?: number
  leading?: boolean
  trailing?: boolean
}

const useDebouncedStateDefaultOptions: UseDebouncedStateOptions = {
  delay: 300,
  leading: false,
  trailing: true,
}

const useDebouncedState = <T,>(
  initialValue: T,
  options: UseDebouncedStateOptions = useDebouncedStateDefaultOptions
) => {
  const [value, setValue] = useState(initialValue)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const canSetState = useRef(true)

  const debouncedSetState = useEventCallback((newValue: T) => {
    if (options.leading && canSetState.current) {
      setValue(newValue)
    }
    canSetState.current = false

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (options.trailing) {
        setValue(newValue)
      }
      canSetState.current = true
    }, options.delay)
  })

  return [value, debouncedSetState] as const
}

const useMouseLocation = () => {
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

export const HiddenFab = ({ onOpen, isOpen, ...rest }: HiddenFabProps) => {
  const isLoading = useAnyLoading()
  const playbackStatus = useStore((state) => state.playbackStatus)
  const manual = useStore((state) => state.manual)

  const fabRef = useRef<HTMLButtonElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

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

    setShowFab(true)
    clearTimeout(timeoutRef.current)

    // hide after 3 seconds if no mouse movement
    timeoutRef.current = setTimeout(() => {
      setShowFab(false)
    }, 3000)

    return
  }, [mouseLocation, playbackStatus, manual])

  return (
    <Zoom in={isLoading || showFab || isOpen}>
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
    </Zoom>
  )
}
