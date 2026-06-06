import { Box } from '@mui/material'

const TONES = [
  'primary',
  'secondary',
  'error',
  'info',
  'success',
  'warning',
] as const

function toneFor(seed: string): (typeof TONES)[number] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return TONES[Math.abs(hash) % TONES.length]
}

function initials(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '')
  return letters.slice(0, 2).toUpperCase() || '··'
}

interface ProviderAvatarProps {
  seed: string
  name: string
  size?: number
}

export const ProviderAvatar = ({
  seed,
  name,
  size = 28,
}: ProviderAvatarProps) => {
  const tone = toneFor(seed)
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size > 30 ? 12 : 10,
        fontWeight: 800,
        bgcolor: (theme) => `${theme.palette[tone].main}33`,
        color: (theme) => theme.palette[tone].main,
      }}
    >
      {initials(name)}
    </Box>
  )
}
