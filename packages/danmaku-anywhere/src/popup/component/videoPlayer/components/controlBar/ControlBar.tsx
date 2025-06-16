import { DanmakuStyleButton } from '@/popup/component/videoPlayer/components/controlBar/DanmakuStyleButton'
import { Box, styled } from '@mui/material'
import { DanmakuSelectButton } from './DanmakuSelectButton'
import { DanmakuToggleButton } from './DanmakuToggleButton'
import { FullscreenButton } from './FullscreenButton'
import { PlayButton } from './PlayButton'
import { PlaybackSpeedButton } from './PlaybackSpeedButton'
import { ProgressBar } from './ProgressBar'
import { TimeDisplay } from './TimeDisplay'
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
  transition: 'opacity 0.3s ease',
}))

const ControlBarRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  gap: 8,
})

const Spacer = styled(Box)({
  flexGrow: 1,
})

export const ControlBar = () => {
  return (
    <ControlBarContainer>
      <ControlBarRow>
        <ProgressBar />
      </ControlBarRow>
      <ControlBarRow>
        <PlayButton />
        <VolumeButton />
        <TimeDisplay />
        <Spacer />
        <DanmakuStyleButton />
        <DanmakuToggleButton />
        <DanmakuSelectButton />
        <PlaybackSpeedButton />
        <FullscreenButton />
      </ControlBarRow>
    </ControlBarContainer>
  )
}
