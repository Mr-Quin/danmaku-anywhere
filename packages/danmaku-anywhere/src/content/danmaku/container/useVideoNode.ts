import { useEffect } from 'react'

import { useMediaElementStore } from '../../store/mediaElementStore'

import { useToast } from '@/common/components/Toast/toastStore'
import { useVideoNodeMonitor } from '@/content/danmaku/container/useVideoNodeMonitor'

export const useVideoNode = (mediaQuery: string) => {
  const videoNode = useVideoNodeMonitor(mediaQuery, {
    onError: (err: Error) => useToast.getState().toast.error(err.message),
  })

  const setVideoNode = useMediaElementStore((state) => state.setVideoNode)

  useEffect(() => {
    setVideoNode(videoNode)
  }, [setVideoNode, videoNode])

  return videoNode
}
