import { useEffect, useRef } from 'react'

const scrollPositions: Map<string, number> = new Map()

export const useStoreScrollPosition = <T extends HTMLElement>(key: string) => {
  const ref = useRef<T>(null)

  useEffect(() => {
    ref.current?.scrollTo(0, scrollPositions.get(key) ?? 0)

    const listener = () => {
      scrollPositions.set(key, ref.current?.scrollTop ?? 0)
    }

    ref.current?.addEventListener('scroll', listener)

    return () => {
      ref.current?.removeEventListener('scroll', listener)
    }
  }, [])

  return ref
}
