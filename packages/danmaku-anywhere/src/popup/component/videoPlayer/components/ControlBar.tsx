import { useMouseDelay } from '@/common/hooks/useMouseDelay'
import {
  Fullscreen,
  Pause,
  PlayArrow,
  VolumeOff,
  VolumeUp,
} from '@mui/icons-material'
import { Box, IconButton, Slider, Typography, styled } from '@mui/material'
import { useEffect, useState } from 'react'
import { useVideoPlayer } from '../VideoPlayerContext'
import { PlaybackSpeedButton } from './PlaybackSpeedButton'
import { TimeDisplay } from './TimeDisplay'

const ControlBarContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  padding: theme.spacing(1),
  background:
    'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 85%)',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  zIndex: 2,
  transition: 'opacity 0.3s ease',
}))

const ControlBarRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  gap: 8,
})

const ProgressSlider = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.main,
  height: 4,
  padding: 0,
  '& .MuiSlider-thumb': {
    width: 12,
    height: 12,
    transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
    '&:hover, &.Mui-focusVisible': {
      boxShadow: `0px 0px 0px 8px ${theme.palette.primary.main}33`,
    },
    '&.Mui-active': {
      width: 16,
      height: 16,
    },
  },
  '& .MuiSlider-rail': {
    opacity: 0.28,
  },
}))

const VolumeSlider = styled(Slider)(({ theme }) => ({
  color: 'white',
  height: 4,
  padding: 0,
  '& .MuiSlider-thumb': {
    width: 10,
    height: 10,
    '&:hover, &.Mui-focusVisible': {
      boxShadow: `0px 0px 0px 8px ${theme.palette.common.white}33`,
    },
  },
  '& .MuiSlider-rail': {
    opacity: 0.28,
  },
}))

const VolumeControlContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
})

const VolumeSliderContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '3em',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  alignItems: 'center',
}))

const Spacer = styled(Box)({
  flexGrow: 1,
})

interface ControlBarProps {
  visible: boolean
}

export const ControlBar = ({ visible }: ControlBarProps) => {
  const {
    player,
    isPlaying,
    isPaused,
    isMuted,
    volume,
    currentTime,
    duration,
    togglePlay,
    toggleMute,
    setVolume,
    seek,
  } = useVideoPlayer()
  const show = useMouseDelay({ enabled: visible, timeout: 2000 })

  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)

  // Update slider value when currentTime changes
  useEffect(() => {
    if (duration > 0) {
      setSliderValue((currentTime / duration) * 100)
    } else {
      setSliderValue(0)
    }
  }, [currentTime, duration])

  const handleProgressChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number
    if (duration > 0) {
      seek((value / 100) * duration)
    }
  }

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number
    setVolume(value / 100)
  }

  const handleFullscreen = () => {
    if (player) {
      if (player.isFullscreen()) {
        player.exitFullscreen()
      } else {
        player.requestFullscreen()
      }
    }
  }

  return (
    <ControlBarContainer sx={{ opacity: visible && show ? 1 : 0 }}>
      <ControlBarRow>
        <ProgressSlider value={sliderValue} onChange={handleProgressChange} />
      </ControlBarRow>
      <ControlBarRow>
        <IconButton onClick={togglePlay} disableRipple>
          {isPaused ? <PlayArrow /> : <Pause />}
        </IconButton>
        <VolumeControlContainer
          onMouseEnter={() => setShowVolumeSlider(true)}
          // onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <IconButton onClick={toggleMute} disableRipple>
            {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
          {showVolumeSlider && (
            <VolumeSliderContainer
            // onMouseEnter={() => setShowVolumeSlider(true)}
            // onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Typography variant="caption">
                {Math.floor(isMuted ? 0 : volume * 100)}
              </Typography>

              <VolumeSlider
                orientation="vertical"
                value={isMuted ? 0 : volume * 100}
                onChange={handleVolumeChange}
                sx={{ height: 80 }}
              />
            </VolumeSliderContainer>
          )}
        </VolumeControlContainer>
        <TimeDisplay />
        <Spacer />
        <PlaybackSpeedButton />
        <IconButton
          onClick={handleFullscreen}
          sx={{ color: 'white', padding: 1 }}
          aria-label="Fullscreen"
        >
          <Fullscreen />
        </IconButton>
      </ControlBarRow>
    </ControlBarContainer>
  )
}
