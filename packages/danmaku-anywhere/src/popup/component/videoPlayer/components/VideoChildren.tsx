import {
  type VideoPlayerContextType,
  useVideoPlayer,
} from '@/popup/component/videoPlayer/VideoPlayerContext'
import type { ReactNode } from 'react'

type VideoChildrenProps = {
  children: ReactNode | VideoChildrenRenderProp
}

export type VideoChildrenRenderProp = (
  state: VideoPlayerContextType
) => ReactNode

export const VideoChildren = ({ children }: VideoChildrenProps) => {
  const state = useVideoPlayer()
  if (typeof children === 'function') return children(state)
  return children
}
