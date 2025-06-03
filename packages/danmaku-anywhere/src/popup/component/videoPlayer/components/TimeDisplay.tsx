import { Box, Typography } from '@mui/material'
import { useVideoPlayer } from '../VideoPlayerContext'

export const TimeDisplay = () => {
  const { currentTime, duration } = useVideoPlayer()

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        padding: '0 8px',
        height: '100%',
      }}
    >
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontFamily: 'monospace',
        }}
      >
        {formatTime(currentTime)}
      </Typography>
      <Typography
        variant="body2"
        component="span"
        sx={{
          margin: '0 4px',
        }}
      >
        {' / '}
      </Typography>
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontFamily: 'monospace',
        }}
      >
        {formatTime(duration)}
      </Typography>
    </Box>
  )
}
