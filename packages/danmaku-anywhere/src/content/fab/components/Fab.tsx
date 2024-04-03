import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'
import type { FabProps } from '@mui/material'
import { Box, Fab, Fade } from '@mui/material'

import { useAnyLoading } from '../../hooks/useAnyLoading'
import { useStore } from '../../store/store'

import { LoadingRipple } from './LoadingRipple'

const LoadingRing = ({ isLoading }: { isLoading: boolean }) => {
  return (
    <Fade in={isLoading}>
      <Box
        component="div"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1,
          height: 1,
        }}
      >
        <LoadingRipple />
      </Box>
    </Fade>
  )
}

interface HiddenFabProps extends FabProps {
  onOpen: () => void
  isOpen: boolean
}

export const HiddenFab = ({ onOpen, isOpen, ...rest }: HiddenFabProps) => {
  const status = useStore((state) => state.status)

  const isLoading = useAnyLoading()

  const getOpacity = () => {
    if (isOpen || isLoading) return 1
    if (status === 'playing') return 0.2
    return 1
  }

  return (
    <Fab
      sx={{
        opacity: getOpacity(),
        transition: 'opacity 0.3s',
      }}
      color="primary"
      aria-label="Add"
      onClick={onOpen}
      {...rest}
    >
      <LoadingRing isLoading={isLoading} />
      {isOpen ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
    </Fab>
  )
}
