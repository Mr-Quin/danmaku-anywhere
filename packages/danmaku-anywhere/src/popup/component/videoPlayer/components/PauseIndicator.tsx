import { Pause, PlayArrow } from '@mui/icons-material'
import { Box, Fade } from '@mui/material'
import { useGesture } from '@use-gesture/react'
import { useVideoPlayer } from '../VideoPlayerContext'

export const PauseIndicator = () => {
  const { isPaused, togglePlay, toggleFullscreen } = useVideoPlayer()
  const bind = useGesture({
    onDoubleClick: toggleFullscreen,
    onClick: togglePlay,
  })

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
      {...bind()}
    >
      <Fade in={isPaused} timeout={300} unmountOnExit={false}>
        <Box
          sx={{
            width: 80,
            height: 80,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {isPaused ? (
            <Pause fontSize="large" />
          ) : (
            <PlayArrow fontSize="large" />
          )}
        </Box>
      </Fade>
    </Box>
  )
}
