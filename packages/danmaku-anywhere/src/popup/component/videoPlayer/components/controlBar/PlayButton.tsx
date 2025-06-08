import { Pause, PlayArrow } from '@mui/icons-material'
import { useVideoPlayer } from '../../VideoPlayerContext'
import { ControlBarButton } from './ControlBarButton'

export const PlayButton = () => {
  const { isPaused, togglePlay } = useVideoPlayer()

  return (
    <ControlBarButton
      onClick={togglePlay}
      tooltip={isPaused ? 'Play' : 'Pause'}
    >
      {isPaused ? <PlayArrow /> : <Pause />}
    </ControlBarButton>
  )
}
