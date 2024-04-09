import { useEffect, useRef } from 'react'

import { useMediaElementStore } from '../../store/mediaElementStore'

import { useRect } from '@/content/common/hooks/useRect'

export const useFullScreenElement = () => {
  const prevFullScreenElement = useRef<Element | null>(null)

  const videoNode = useMediaElementStore.use.videoNode()
  const fullScreenElement = useMediaElementStore.use.fullScreenElement()
  const setFullScreenElement = useMediaElementStore.use.setFullScreenElement()

  const rect = useRect(videoNode)

  useEffect(() => {
    if (!rect) return

    const fullScreenElement = document.fullscreenElement

    if (prevFullScreenElement.current === fullScreenElement) return

    setFullScreenElement(fullScreenElement)
    prevFullScreenElement.current = fullScreenElement
  }, [rect])

  return fullScreenElement
}
