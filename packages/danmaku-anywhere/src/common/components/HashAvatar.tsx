import { Box } from '@mui/material'

// Avatar tint derived from a seed: the hash sets the hue, the theme sets
// lightness/chroma. Keep the OKLCH values here (not inline) so every hashed
// avatar can be restyled in one place. Light and dark each get their own
// ink/tint pair so the chip stays legible on either background.
const AVATAR_OKLCH = {
  light: { tint: { l: 0.93, c: 0.045 }, ink: { l: 0.58, c: 0.135 } },
  dark: { tint: { l: 0.32, c: 0.05 }, ink: { l: 0.82, c: 0.12 } },
} as const

function hueFromSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

// One glyph for CJK labels, two letters for Latin ones, so a Chinese label
// reads as e.g. 哔 rather than collapsing to a placeholder.
export function avatarInitials(label: string): string {
  const clean = label.trim()
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

interface HashAvatarProps {
  // Hashed for the hue, so the same entity keeps its tint across renders. Also
  // the natural slot for a real icon/logo later.
  seed: string
  label: string
  size?: number
}

export const HashAvatar = ({ seed, label, size = 28 }: HashAvatarProps) => {
  const h = hueFromSeed(seed)
  return (
    <Box
      sx={(theme) => {
        const { tint, ink } = AVATAR_OKLCH[theme.palette.mode]
        return {
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
          bgcolor: `oklch(${tint.l} ${tint.c} ${h})`,
          color: `oklch(${ink.l} ${ink.c} ${h})`,
        }
      }}
    >
      {avatarInitials(label)}
    </Box>
  )
}
