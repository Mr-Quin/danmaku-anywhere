import { useEffect } from 'react'

import { useNodeMonitor } from '../../hooks/useNodeMonitor'
import { useMediaElementStore } from '../../store/mediaElementStore'

import { useToast } from '@/common/components/toast/toastStore'

export const useVideoNode = (mediaQuery: string) => {
  const videoNode = useNodeMonitor<HTMLVideoElement>(mediaQuery, {
    onError: (err: Error) => useToast.getState().toast.error(err.message),
  })

  const setVideoNode = useMediaElementStore((state) => state.setVideoNode)

  useEffect(() => {
    setVideoNode(videoNode)
  }, [setVideoNode, videoNode])

  return videoNode
}
