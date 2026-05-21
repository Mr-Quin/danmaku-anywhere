import { Box, Tooltip } from '@mui/material'
import { DEV_BRANCH, IS_DA_DEV } from '@/common/constants'

type Variant = 'popup' | 'content'

const containerSx = {
  popup: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    zIndex: (theme: { zIndex: { tooltip: number } }) => theme.zIndex.tooltip,
    pointerEvents: 'auto' as const,
  },
  content: {
    position: 'fixed' as const,
    top: 4,
    right: 4,
    zIndex: 2147483646,
    pointerEvents: 'none' as const,
  },
}

const chipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 0.75,
  py: 0.125,
  borderRadius: 1,
  fontFamily: 'monospace',
  fontSize: 10,
  lineHeight: 1.4,
  color: '#fff',
  bgcolor: 'rgba(220, 38, 38, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  userSelect: 'none' as const,
  maxWidth: 240,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  opacity: 0.7,
}

export function DevWatermark({ variant }: { variant: Variant }) {
  if (!IS_DA_DEV) {
    return null
  }
  const label = DEV_BRANCH ? `DEV · ${DEV_BRANCH}` : 'DEV'
  const node = <Box sx={chipSx}>{label}</Box>
  return (
    <Box sx={containerSx[variant]} aria-hidden="true">
      {variant === 'popup' ? (
        <Tooltip title={DEV_BRANCH || 'development build'} placement="left">
          {node}
        </Tooltip>
      ) : (
        node
      )}
    </Box>
  )
}
