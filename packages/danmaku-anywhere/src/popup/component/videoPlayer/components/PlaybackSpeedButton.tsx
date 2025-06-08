import { MenuItem } from '@mui/material'
import { useVideoPlayer } from '../VideoPlayerContext'
import { ControlBarButton } from './ControlBarButton'

interface PlaybackSpeedButtonProps {
  rates?: number[]
}

export const PlaybackSpeedButton = ({
  rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
}: PlaybackSpeedButtonProps) => {
  const { playbackRate, setPlaybackRate } = useVideoPlayer()

  const handleRateSelect = (rate: number) => {
    setPlaybackRate(rate)
  }

  const menuContent = (
    <>
      {rates.map((rate) => (
        <MenuItem
          key={rate}
          onClick={() => handleRateSelect(rate)}
          selected={rate === playbackRate}
          sx={{
            justifyContent: 'center',
            fontSize: '14px',
            padding: '8px 12px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              fontWeight: 'bold',
            },
          }}
        >
          {rate}x
        </MenuItem>
      ))}
    </>
  )

  return (
    <ControlBarButton
      tooltip="Playback Speed"
      menu={{
        content: menuContent,
      }}
    >
      {playbackRate}x
    </ControlBarButton>
  )
}
