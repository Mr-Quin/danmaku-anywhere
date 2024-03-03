import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'
import type { FabProps } from '@mui/material'
import { Box, Fab } from '@mui/material'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import { LoadingRipple } from './LoadingRipple'

const LoadingRing = ({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null

  return (
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
  )
}

interface HiddenFabProps extends FabProps {
  onOpen: () => void
  isOpen: boolean
}

export const HiddenFab = ({ onOpen, isOpen, ...rest }: HiddenFabProps) => {
  const status = useStore((state) => state.status)

  const isMutating = useIsMutating() > 0
  const isFetching = useIsFetching() > 0

  const isLoading = isMutating || isFetching

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
