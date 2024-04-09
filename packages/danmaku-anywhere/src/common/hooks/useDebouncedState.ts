import { useEventCallback } from '@mui/material'
import { useRef, useState } from 'react'

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

export const useDebouncedState = <T>(
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
