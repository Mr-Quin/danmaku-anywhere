import { RefCallback, RefObject } from 'preact'

export const mergeRefs = <T>(
  ...refs: (RefObject<T> | RefCallback<T> | null)[]
) => {
  return (value: any) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref != null) {
        ref.current = value
      }
    })
  }
}
