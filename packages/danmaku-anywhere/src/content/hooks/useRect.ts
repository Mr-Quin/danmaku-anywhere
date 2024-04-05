import { useEffect as useLayoutEffect, useState } from 'react'

export const useRect = (node: HTMLElement | null) => {
  const [rect, setRect] = useState<DOMRectReadOnly>()

  useLayoutEffect(() => {
    if (!node) return

    const handleResize = () => {
      setRect(node.getBoundingClientRect())
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { target } = entry
        if (target === node) {
          // entry.contentRect does not provide the correct location value
          handleResize()
        }
      }
    })

    window.addEventListener('resize', handleResize)
    resizeObserver.observe(node)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      setRect(undefined)
    }
  }, [node])

  return rect
}
