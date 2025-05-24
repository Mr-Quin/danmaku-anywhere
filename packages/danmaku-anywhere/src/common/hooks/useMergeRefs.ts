import type { Ref, RefObject } from 'react'

export const useMergeRefs = <T>(...refs: (Ref<T> | undefined)[]): Ref<T> => {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref) {
        ;(ref as RefObject<T | null>).current = value
      }
    })
  }
}
