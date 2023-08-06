import { useCallback, useLayoutEffect, useRef } from 'react'

type Fn<A extends any[], R> = (...args: A) => R

export const useStableCallback = <A extends any[], R>(
  callback: Fn<A, R>
): Fn<A, R> => {
  const ref = useRef(callback)

  useLayoutEffect(() => {
    ref.current = callback
  }, [callback])

  return useCallback((...args) => {
    return ref.current(...args)
  }, [])
}
