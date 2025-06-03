import { Box, Menu, MenuItem } from '@mui/material'
import { useRef, useState } from 'react'
import { useVideoPlayer } from '../VideoPlayerContext'
import { ControlBarButton } from './ControlBarButton'

interface PlaybackSpeedButtonProps {
  rates?: number[]
}

export const PlaybackSpeedButton = ({
  rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
}: PlaybackSpeedButtonProps) => {
  const { playbackRate, setPlaybackRate } = useVideoPlayer()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    setAnchorEl(buttonRef.current)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleRateSelect = (rate: number) => {
    setPlaybackRate(rate)
    handleClose()
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <ControlBarButton
        ref={buttonRef}
        onClick={handleClick}
        title="Playback Speed"
        sx={{ minWidth: 40 }}
      >
        {playbackRate}x
      </ControlBarButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: 'rgba(43, 51, 63, 0.9)',
            color: 'white',
            minWidth: 80,
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
            marginBottom: '8px',
          },
        }}
      >
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
      </Menu>
    </Box>
  )
}
