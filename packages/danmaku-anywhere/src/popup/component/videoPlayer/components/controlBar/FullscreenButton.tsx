import { Fullscreen, FullscreenExit } from '@mui/icons-material'
import { useVideoPlayer } from '../../VideoPlayerContext'
import { ControlBarButton } from './ControlBarButton'

export const FullscreenButton = () => {
  const { isFullscreen, toggleFullscreen } = useVideoPlayer()

  return (
    <ControlBarButton
      onClick={toggleFullscreen}
      tooltip={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
    </ControlBarButton>
  )
}
