import { Box, CircularProgress, Typography } from '@mui/material'

interface StatusTextProps {
  message: string
  loading?: boolean
}

export const VideoStatus = ({ message, loading = false }: StatusTextProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
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
