import { Box, Fade } from '@mui/material'
import { createPortal } from 'react-dom'

import { LoadingRing } from '@/content/controller/ui/floatingButton/components/LoadingRing'

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
        <LoadingRing isLoading={isLoading} />
      </Box>
    </Fade>,
    anchor
  )
}
