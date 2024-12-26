import { Box, Fade } from '@mui/material'

import { LoadingRipple } from './LoadingRipple'

export const LoadingRing = ({ isLoading }: { isLoading: boolean }) => {
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
