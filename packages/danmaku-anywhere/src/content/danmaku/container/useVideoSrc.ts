import { useEffect, useState } from 'react'

export const useVideoSrc = (videoNode: HTMLVideoElement | null) => {
  const [videoSrc, setVideoSrc] = useState<string>()

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
      setVideoSrc(undefined)
    }

    return () => {
      observer.disconnect()
    }
  }, [videoNode])

  return videoSrc
}
