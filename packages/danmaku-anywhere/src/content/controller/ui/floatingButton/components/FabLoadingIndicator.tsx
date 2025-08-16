import { Box, Fade } from '@mui/material'
import { createPortal } from 'react-dom'

import { CircularSpinner } from '@/content/controller/ui/floatingButton/components/CircularSpinner'

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
        width={40}
        height={40}
        top={0}
        left={0}
        sx={{
          pointerEvents: 'none',
        }}
      >
        <CircularSpinner isLoading={isLoading} />
      </Box>
    </Fade>,
    anchor
  )
}
