import { Chip, Stack } from '@mui/material'
import {
  DEV_BRANCH,
  EXTENSION_VERSION,
  IS_DA_DEV,
  IS_DA_E2E,
  IS_DA_PREVIEW,
} from '@/common/constants'

type Mode = { label: string; color: 'warning' | 'info' | 'success' }

function resolveMode(): Mode | null {
  if (IS_DA_DEV) {
    return { label: 'DEV', color: 'warning' }
  }
  if (IS_DA_PREVIEW) {
    return { label: 'PREVIEW', color: 'info' }
  }
  if (IS_DA_E2E) {
    return { label: 'E2E', color: 'success' }
  }
  return null
}

const CHIP_HEIGHT = 22
const CHIP_FONT_SIZE = 11

export function DevWatermark() {
  const mode = resolveMode()
  if (!mode) {
    return null
  }
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      aria-hidden="true"
      sx={{
        position: 'absolute',
        bottom: 6,
        left: 6,
        pointerEvents: 'none',
        zIndex: 10,
        maxWidth: 'calc(100% - 12px)',
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))',
      }}
    >
      <Chip
        label={mode.label}
        size="small"
        color={mode.color}
        sx={{
          height: CHIP_HEIGHT,
          fontSize: CHIP_FONT_SIZE,
          fontWeight: 800,
          letterSpacing: 0.75,
          '& .MuiChip-label': { px: 1 },
        }}
      />
      <Chip
        label={`v${EXTENSION_VERSION}`}
        size="small"
        color={mode.color}
        variant="outlined"
        sx={{
          height: CHIP_HEIGHT,
          fontSize: CHIP_FONT_SIZE,
          fontWeight: 700,
          fontFamily: 'monospace',
          backgroundColor: 'background.paper',
          '& .MuiChip-label': { px: 0.875 },
        }}
      />
      {DEV_BRANCH && (
        <Chip
          label={DEV_BRANCH}
          size="small"
          variant="outlined"
          sx={{
            height: CHIP_HEIGHT,
            fontSize: CHIP_FONT_SIZE,
            fontFamily: 'monospace',
            backgroundColor: 'background.paper',
            minWidth: 0,
            '& .MuiChip-label': {
              px: 0.875,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            },
          }}
        />
      )}
    </Stack>
  )
}
