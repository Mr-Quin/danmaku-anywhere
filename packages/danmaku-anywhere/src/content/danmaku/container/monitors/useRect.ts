import { useLayoutEffect, useState } from 'react'

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

export class RectObserver {
  private readonly node: HTMLElement
  private currentRect: DOMRectReadOnly
  private interval: NodeJS.Timeout | undefined
  private rectChangeListeners: Set<(rect: DOMRectReadOnly) => void>
  private resizeObserver: ResizeObserver

  constructor(node: HTMLElement) {
    this.node = node
    this.currentRect = getRect(node)
    this.rectChangeListeners = new Set()
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.node) {
          this.handleResize()
        }
      }
    })

    window.addEventListener('resize', this.handleResize)
    window.addEventListener('scroll', this.handleResize)

    this.resizeObserver.observe(node)
    this.handleResize()
  }

  get rect() {
    return this.currentRect
  }

  private handleResize = () => {
    const newRect = getRect(this.node)

    if (this.interval) {
      clearInterval(this.interval)
    }

    this.interval = setInterval(() => {
      const newRect = getRect(this.node)

      if (!this.currentRect) {
        return clearInterval(this.interval!)
      }

      if (areRectsEqual(this.currentRect, newRect)) {
        clearInterval(this.interval!)
      } else {
        this.setCurrentRect(newRect)
      }
    }, 1000)

    this.setCurrentRect(newRect)
  }

  private setCurrentRect(rect: DOMRectReadOnly) {
    if (!areRectsEqual(this.currentRect, rect)) {
      this.rectChangeListeners.forEach((listener) => listener(rect))
    }
    this.currentRect = rect
  }

  public onRectChange(callback: (rect: DOMRectReadOnly) => void) {
    this.rectChangeListeners.add(callback)
    callback(this.currentRect)
  }

  public cleanup() {
    this.resizeObserver.disconnect()
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('scroll', this.handleResize)
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}

export const useRect = (node: HTMLElement | null) => {
  const [rect, setRect] = useState<DOMRectReadOnly | undefined>()

  useLayoutEffect(() => {
    if (!node) return

    const rectObserver = new RectObserver(node)
    rectObserver.onRectChange(setRect)
    setRect(rectObserver.rect)

    return () => {
      rectObserver.cleanup()
    }
  }, [node])

  return rect
}
