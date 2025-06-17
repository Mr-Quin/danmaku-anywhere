import { Box, CircularProgress, Typography } from '@mui/material'

interface StatusTextProps {
  message: string
  loading?: boolean
  width: number
  height: number
}

export const VideoStatus = ({ width,height, message, loading = false }: StatusTextProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {message && (
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: 'white',
            marginBottom: loading ? 2 : 0,
          }}
        >
          {message}
        </Typography>
      )}

      {loading && <CircularProgress color="inherit" />}
    </Box>
  )
}
