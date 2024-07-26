import { useEffect } from 'react'

import { useMediaElementStore } from '../../store/mediaElementStore'

import { useToast } from '@/common/components/Toast/toastStore'
import { useNodeMonitor } from '@/content/common/hooks/useNodeMonitor'

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
