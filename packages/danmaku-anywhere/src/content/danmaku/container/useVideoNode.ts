import { useEffect } from 'react'

import { useMediaElementStore } from '../../store/mediaElementStore'

import { useVideoNodeMonitor } from '@/content/danmaku/container/monitors/useVideoNodeMonitor'
import { useStore } from '@/content/store/store'

export const useVideoNode = (mediaQuery: string) => {
  const videoNode = useVideoNodeMonitor(mediaQuery)

  const setVideoNode = useMediaElementStore((state) => state.setVideoNode)
  const setHasVideo = useStore.use.setHasVideo()

  useEffect(() => {
    setVideoNode(videoNode)
  }, [setVideoNode, videoNode])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!videoNode) {
      // Set the hasVideoNode to false after a delay to prevent flickering
      timeout = setTimeout(() => {
        setHasVideo(false)
      }, 5000)
    } else {
      setHasVideo(true)
    }
    return () => {
      clearTimeout(timeout)
    }
  }, [videoNode, setHasVideo])

  return videoNode
}
