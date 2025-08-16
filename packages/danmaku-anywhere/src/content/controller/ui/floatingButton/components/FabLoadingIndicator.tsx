import { Box, CircularProgress, Fade } from '@mui/material'
import { createPortal } from 'react-dom'

interface FabLoadingIndicatorProps {
  anchor: Element
  isLoading: boolean
}

export const FabLoadingIndicator = ({
  anchor,
  isLoading,
}: FabLoadingIndicatorProps) => {
  return createPortal(
    <Fade in={isLoading}>
      <Box
        position="absolute"
        width={48}
        height={48}
        top={-4}
        left={-4}
        sx={{
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress
          size={48}
          thickness={3}
          color="inherit"
          sx={{ color: 'common.white', opacity: 0.9 }}
        />
      </Box>
    </Fade>,
    anchor
  )
}
