import { useCallback, useState, useRef } from 'preact/hooks'

export const useDelayedState = <T>(initialState: T, delay = 0) => {
  const [state, setState] = useState(initialState)
  const timeoutRef = useRef<number | null>(null)

  const setDelayedState = useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setState(value)
      }, delay)
    },
    [delay]
  )

  return [state, setDelayedState, setState] as const
}
