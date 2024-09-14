import { useLayoutEffect, useRef, useState } from 'react'

const areRectsEqual = (rect1: DOMRectReadOnly, rect2: DOMRectReadOnly) => {
  return (
    rect1.x === rect2.x &&
    rect1.y === rect2.y &&
    rect1.width === rect2.width &&
    rect1.height === rect2.height
  )
}

const getRect = (node: HTMLElement) => {
  const { top, left, width, height } = node.getBoundingClientRect()

  // since rect is relative to the viewport, we need to add the scroll position to get the absolute position
  return new DOMRectReadOnly(
    left + window.scrollX,
    top + window.scrollY,
    width,
    height
  )
}

export const useRect = (node: HTMLElement | null) => {
  const [rect, setRect] = useState<DOMRectReadOnly>()

  const rectRef = useRef<DOMRectReadOnly>()

  useLayoutEffect(() => {
    if (!node) return

    let interval: NodeJS.Timeout

    const handleResize = () => {
      const newRect = getRect(node)
      setRect(newRect)
      rectRef.current = newRect

      /**
       * Because animation on CSS transform does NOT trigger ResizeObserver,
       * we'll periodically check the rect of the node and set it if it changes
       */
      if (interval) {
        clearInterval(interval)
      }

      interval = setInterval(() => {
        const newRect = getRect(node)

        if (!rectRef.current) {
          // should not happen
          return clearInterval(interval)
        }

        if (areRectsEqual(rectRef.current, newRect)) {
          // rect has not changed, assume no animation
          clearInterval(interval)
        } else {
          setRect(newRect)
          rectRef.current = newRect
        }
      }, 1000)
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { target } = entry

        if (target === node) {
          /**
           * entry.contentRect does not always provide the correct top and left values
           * https://www.w3.org/TR/resize-observer/#create-and-populate-resizeobserverentry-h
           * So we'll use getBoundingClientRect() instead
           */
          handleResize()
        }
      }
    })

    window.addEventListener('resize', handleResize)
    // Track scroll since top and left are relative to the viewport thus need to be updated
    window.addEventListener('scroll', handleResize)
    resizeObserver.observe(node)
    handleResize()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
      setRect(undefined)
      clearInterval(interval)
    }
  }, [node])

  return rect
}
