import { Box } from '@mui/material'

interface MonogramProps {
  name: string
  size?: number
}

export const Monogram = ({ name, size = 42 }: MonogramProps) => {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: size / 24,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        bgcolor: 'primary.light',
        color: 'primaryInk',
      }}
    >
      {initial}
    </Box>
  )
}
