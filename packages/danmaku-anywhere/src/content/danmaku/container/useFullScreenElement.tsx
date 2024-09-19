import { useEffect, useRef } from 'react'

export const useFullScreenElement = (videoRect?: DOMRectReadOnly) => {
  const prevFullScreenElement = useRef<Element | null>(null)

  useEffect(() => {
    if (!videoRect) return

    const fullScreenElement = document.fullscreenElement

    if (prevFullScreenElement.current === fullScreenElement) return

    /**
     * When the video enters full screen, hide then show the popover
     * so that it will appear on top of the full screen element,
     * since the last element in the top layer is shown on top
     */
    if (fullScreenElement) {
      document.getElementById('danmaku-anywhere')?.hidePopover()
      document.getElementById('danmaku-anywhere')?.showPopover()
    }

    prevFullScreenElement.current = fullScreenElement
  }, [videoRect])
}
