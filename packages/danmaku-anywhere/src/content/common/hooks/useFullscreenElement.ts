import { useEffect, useState } from 'react'

export function useFullscreenElement(): Element | null {
  const [element, setElement] = useState(() => document.fullscreenElement)

  useEffect(() => {
    const handleChange = () => {
      setElement(document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
    }
  }, [])

  return element
}
