import { Box, CircularProgress, Fade } from '@mui/material'

interface FabLoadingIndicatorProps {
  isLoading: boolean
}

export const FabLoadingIndicator = ({
  isLoading,
}: FabLoadingIndicatorProps) => {
  return (
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
          color="primary"
          sx={{ opacity: 0.8 }}
        />
      </Box>
    </Fade>
  )
}
