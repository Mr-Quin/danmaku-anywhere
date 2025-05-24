import { useEffect, useRef } from 'react'

const scrollPositions: Record<string, number> = {}

export const useStoreScrollPosition = <T extends HTMLElement>(key: string) => {
  const ref = useRef<T>(null)

  useEffect(() => {
    ref.current?.scrollTo(0, scrollPositions[key])

    const listener = () => {
      scrollPositions[key] = ref.current?.scrollTop ?? 0
    }

    ref.current?.addEventListener('scroll', listener)

    return () => {
      ref.current?.removeEventListener('scroll', listener)
    }
  }, [])

  return ref
}
