import { useState, useEffect, useRef } from 'preact/hooks'

export const useIsVisible = <T extends HTMLElement>(
  options?: IntersectionObserverInit
) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<T | null>(null)
  const savedRef = useRef<T | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        } else {
          setIsVisible(false)
        }
      })
    }, options)

    if (ref.current) {
      observer.observe(ref.current)
      savedRef.current = ref.current
    }

    return () => {
      if (savedRef.current) {
        observer.unobserve(savedRef.current)
      }
    }
  }, [ref, options])

  return [isVisible, ref] as const
}
