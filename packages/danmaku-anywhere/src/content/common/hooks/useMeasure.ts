import { useEffect, useRef, useState } from 'react'

export const useMeasure = () => {
  const [dim, setDim] = useState([0, 0])

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    setDim([ref.current.offsetWidth, ref.current.offsetHeight])

    const obs = new ResizeObserver(([entry]) => {
      setDim([entry.contentRect.width, entry.contentRect.height])
    })

    obs.observe(ref.current)

    return () => {
      obs.disconnect()
    }
  }, [])

  return [ref, dim] as const
}
