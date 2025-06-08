import { VolumeOff, VolumeUp } from '@mui/icons-material'
import { Slider, Stack, Typography, styled } from '@mui/material'
import { useVideoPlayer } from '../../VideoPlayerContext'
import { ControlBarButton } from './ControlBarButton'

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

export const VolumeButton = () => {
  const { isMuted, volume, toggleMute, setVolume } = useVideoPlayer()

  const handleVolumeChange = (_: unknown, newValue: number | number[]) => {
    const value = newValue as number
    setVolume(value / 100)
  }

  return (
    <ControlBarButton
      onClick={toggleMute}
      menu={{
        content: (
          <Stack
            direction="column"
            alignItems="center"
            gap={1}
            p={1}
            minWidth="4em"
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
          </Stack>
        ),
      }}
    >
      {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
    </ControlBarButton>
  )
}
