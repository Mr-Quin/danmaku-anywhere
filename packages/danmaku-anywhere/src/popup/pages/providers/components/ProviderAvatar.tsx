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

// One glyph for CJK names, two letters for Latin ones. Keeps a Chinese source
// readable as e.g. 哔 rather than collapsing to a placeholder.
export function providerInitials(name: string): string {
  const clean = name.trim()
  if (!clean) {
    return '··'
  }
  if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(clean)) {
    return Array.from(clean)[0]
  }
  const letters = clean.replace(/[^A-Za-z0-9]/g, '')
  if (letters) {
    return letters.slice(0, 2).toUpperCase()
  }
  return Array.from(clean)[0]
}

interface ProviderAvatarProps {
  // Hashed for the colour, so a source keeps the same tint across renders. Also
  // the natural slot for a per-manifest logo later.
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
        fontSize: size > 30 ? 13 : 11,
        fontWeight: 700,
        lineHeight: 1,
        bgcolor: (theme) => `${theme.palette[tone].main}33`,
        color: (theme) => theme.palette[tone].main,
      }}
    >
      {providerInitials(name)}
    </Box>
  )
}
