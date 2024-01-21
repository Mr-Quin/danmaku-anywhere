import { Fab, FabProps } from '@mui/material'
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'
import { useStore } from '../store/store'

interface HiddenFabProps extends FabProps {
  onOpen: () => void
  isOpen: boolean
}

export const HiddenFab = ({ onOpen, isOpen, ...rest }: HiddenFabProps) => {
  const { status } = useStore()

  const getOpacity = () => {
    if (isOpen) return 1
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
      {isOpen ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
    </Fab>
  )
}
