import { useIsTouchDevice } from '@/content/controller/common/hooks/useIsTouchDevice'
import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { Box, styled } from '@mui/material'
import { type PropsWithChildren, useEffect, useRef } from 'react'

const StyledVideoPlayerWrapper = styled(Box)(() => ({
  position: 'relative',
  isolation: 'isolate',
  contain: 'layout',
  color: 'white',
}))

export const VideoPlayerWrapper = ({ children }: PropsWithChildren) => {
  const { setIsHovering, isHovering, setSize } = useVideoPlayer()
  const isTouchDevice = useIsTouchDevice()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    setSize([ref.current.clientWidth, ref.current.clientHeight])

    const obs = new ResizeObserver(([entry]) => {
      setSize([entry.contentRect.width, entry.contentRect.height])
    })

    obs.observe(ref.current)

    return () => {
      obs.disconnect()
    }
  }, [setSize])

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  const handleClick = () => {
    if (isTouchDevice) {
      setIsHovering(!isHovering)
    }
  }

  return (
    <StyledVideoPlayerWrapper
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
    </StyledVideoPlayerWrapper>
  )
}
