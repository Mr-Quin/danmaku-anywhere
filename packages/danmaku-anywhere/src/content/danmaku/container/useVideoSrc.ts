import { useEffect } from 'react'

import { useMediaElementStore } from '@/content/store/mediaElementStore'

export const useVideoSrc = (videoNode: HTMLVideoElement | null) => {
  const setVideoSrc = useMediaElementStore((state) => state.setVideoSrc)

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target as HTMLVideoElement
        setVideoSrc(target.src)
      }
    })

    if (videoNode) {
      setVideoSrc(videoNode.src)
      observer.observe(videoNode, {
        attributes: true,
        attributeFilter: ['src'],
      })
    } else {
      setVideoSrc(null)
    }

    return () => {
      observer.disconnect()
    }
  }, [videoNode])
}
