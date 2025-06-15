import { Pause, PlayArrow } from '@mui/icons-material'
import { Box, Fade } from '@mui/material'
import { useRef } from 'react'
import { useVideoPlayer } from '../VideoPlayerContext'

export const PauseIndicator = () => {
  const { isPaused, togglePlay, toggleFullscreen } = useVideoPlayer()

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleClick = () => {
    // for single clicks, trigger pause after a small delay to differentiate from double click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    clickTimeoutRef.current = setTimeout(() => {
      togglePlay()
    }, 150)
  }

  const handleDoubleClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    toggleFullscreen()
  }

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
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
