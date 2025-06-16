import { useMouseDelay } from '@/common/hooks/useMouseDelay'
import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { Fade } from '@mui/material'
import { VideoHeader } from './VideoHeader'
import { ControlBar } from './controlBar/ControlBar'

interface HeaderControlBarContainerProps {
  title?: string
  showInfoButton?: boolean
  onInfoClick?: () => void
}

export const FadeContainer = ({
  title,
  showInfoButton = false,
  onInfoClick,
}: HeaderControlBarContainerProps) => {
  const { isHovering, isButtonHovering } = useVideoPlayer()
  const show = useMouseDelay({ enabled: isHovering, timeout: 2000 })

  return (
    <Fade in={(show && isHovering) || isButtonHovering} timeout={300}>
      <div>
        {title && (
          <VideoHeader
            title={title}
            showInfoButton={showInfoButton}
            onInfoClick={onInfoClick}
          />
        )}
        <ControlBar />
      </div>
    </Fade>
  )
}
