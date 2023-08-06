import { useCallback, useEffect, useRef } from 'react'

export const useStableData = <T>(data: T) => {
  const ref = useRef(data)

  useEffect(() => {
    ref.current = data
  }, [data])

  return useCallback(() => ref.current, [])
}
