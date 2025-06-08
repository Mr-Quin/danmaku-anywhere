import { useMouseDelay } from '@/common/hooks/useMouseDelay'
import { Box, Slider, styled } from '@mui/material'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { useVideoPlayer } from '../../VideoPlayerContext'
import { TimeDisplay } from '../TimeDisplay'
import { DanmakuToggleButton } from './DanmakuToggleButton'
import { FullscreenButton } from './FullscreenButton'
import { PlayButton } from './PlayButton'
import { PlaybackSpeedButton } from './PlaybackSpeedButton'
import { SelectDanmakuButton } from './SelectDanmakuButton'
import { StyledTooltip } from './StyledTooltip'
import { VolumeButton } from './VolumeButton'

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

const Spacer = styled(Box)({
  flexGrow: 1,
})

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
}

interface ControlBarProps {
  visible: boolean
}

export const ControlBar = ({ visible }: ControlBarProps) => {
  const { currentTime, duration, seek, isHovering } = useVideoPlayer()

  const show = useMouseDelay({ enabled: visible, timeout: 2000 })
  const [sliderValue, setSliderValue] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSliderHover, setIsSliderHover] = useState(false)
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const sliderRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (isDragging) return
    if (duration > 0) {
      setSliderValue((currentTime / duration) * 100)
    } else if (duration <= 0) {
      setSliderValue(0)
    }
  }, [currentTime, duration, isDragging])

  const handleProgressChange = (_: unknown, newValue: number | number[]) => {
    const value = newValue as number
    setSliderValue(value)
  }

  const handleProgressChangeCommitted = (
    _: unknown,
    newValue: number | number[]
  ) => {
    const value = newValue as number
    if (duration > 0) {
      seek((value / 100) * duration)
    }
    setIsDragging(false)
  }

  const handleSliderMouseMove = (event: MouseEvent) => {
    if (!sliderRef.current || duration <= 0) return

    const rect = sliderRef.current.getBoundingClientRect()
    const percent = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1
    )
    setHoverValue(percent * 100)
  }

  const handleSliderMouseDown = () => {
    setIsDragging(true)
  }

  return (
    <ControlBarContainer
      sx={{ opacity: (show || isHovering) && visible ? 1 : 0 }}
    >
      <ControlBarRow>
        <StyledTooltip
          title={
            hoverValue !== null ? formatTime((hoverValue / 100) * duration) : ''
          }
          enterDelay={100}
          leaveDelay={100}
          open={isSliderHover}
          arrow
          placement="top"
          followCursor
        >
          <ProgressSlider
            ref={sliderRef}
            value={sliderValue}
            onChange={handleProgressChange}
            onChangeCommitted={handleProgressChangeCommitted}
            onMouseEnter={() => setIsSliderHover(true)}
            onMouseMove={handleSliderMouseMove}
            onMouseLeave={() => setIsSliderHover(false)}
            onMouseDown={handleSliderMouseDown}
          />
        </StyledTooltip>
      </ControlBarRow>
      <ControlBarRow>
        <PlayButton />
        <VolumeButton />
        <TimeDisplay />
        <Spacer />
        <DanmakuToggleButton />
        <SelectDanmakuButton />
        <PlaybackSpeedButton />
        <FullscreenButton />
      </ControlBarRow>
    </ControlBarContainer>
  )
}
