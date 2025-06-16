import { useDuration } from '@/popup/component/videoPlayer/hooks/useDuration'
import { Box, Slider, styled } from '@mui/material'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { useVideoPlayer } from '../../VideoPlayerContext'
import { StyledTooltip } from './StyledTooltip'

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

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
}

export const ProgressBar = () => {
  const { seek, player } = useVideoPlayer()
  const { currentTime, duration } = useDuration()
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime)

  const [sliderValue, setSliderValue] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [isSliderHover, setIsSliderHover] = useState(false)
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const sliderRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!player) return
    const onSeeking = () => {
      setIsSeeking(true)
    }

    const onSeeked = () => {
      setIsSeeking(false)
    }

    player.on('seeking', onSeeking)
    player.on('seeked', onSeeked)

    return () => {
      player.off('seeking', onSeeking)
      player.off('seeked', onSeeked)
    }
  }, [player])

  useEffect(() => {
    if (isSeeking || isDragging) return
    setLocalCurrentTime(currentTime)
  }, [currentTime, isSeeking, isDragging])

  useEffect(() => {
    if (duration > 0) {
      setSliderValue((localCurrentTime / duration) * 100)
    } else {
      setSliderValue(0)
    }
  }, [localCurrentTime, duration])

  const handleProgressChange = (_: unknown, newValue: number | number[]) => {
    const value = newValue as number
    setSliderValue(value)
  }

  const handleProgressChangeCommitted = (
    _: unknown,
    newValue: number | number[]
  ) => {
    const value = newValue as number

    const seekTime = duration > 0 ? (value / 100) * duration : 0
    seek(seekTime)
    setIsSeeking(true)
    setLocalCurrentTime(seekTime)
    setSliderValue(value)

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
    <Box sx={{ width: '100%' }}>
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
    </Box>
  )
}
