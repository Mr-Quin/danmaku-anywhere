import type { MutableRefObject, Ref } from 'react'

export const useMergeRefs = <T>(...refs: Ref<T>[]): Ref<T> => {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref) {
        ;(ref as MutableRefObject<T | null>).current = value
      }
    })
  }
}
