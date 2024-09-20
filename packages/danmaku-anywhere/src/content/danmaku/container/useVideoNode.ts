import { useEffect } from 'react'

import { useMediaElementStore } from '../../store/mediaElementStore'

import { useVideoNodeMonitor } from '@/content/danmaku/container/monitors/useVideoNodeMonitor'

export const useVideoNode = (mediaQuery: string) => {
  const videoNode = useVideoNodeMonitor(mediaQuery)

  const setVideoNode = useMediaElementStore((state) => state.setVideoNode)

  useEffect(() => {
    setVideoNode(videoNode)
  }, [setVideoNode, videoNode])

  return videoNode
}
