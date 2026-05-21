import { Chip, Stack } from '@mui/material'
import { DEV_BRANCH, IS_DA_DEV, IS_DA_PREVIEW } from '@/common/constants'

type Mode = { label: string; color: 'warning' | 'info' }

function resolveMode(): Mode | null {
  if (IS_DA_DEV) {
    return { label: 'DEV', color: 'warning' }
  }
  if (IS_DA_PREVIEW) {
    return { label: 'PREVIEW', color: 'info' }
  }
  return null
}

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
        bottom: 4,
        left: 6,
        pointerEvents: 'none',
        zIndex: 10,
        opacity: 0.8,
        maxWidth: 'calc(100% - 12px)',
      }}
    >
      <Chip
        label={mode.label}
        size="small"
        color={mode.color}
        sx={{
          height: 18,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.5,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
      {DEV_BRANCH && (
        <Chip
          label={DEV_BRANCH}
          size="small"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: 10,
            fontFamily: 'monospace',
            minWidth: 0,
            '& .MuiChip-label': {
              px: 0.75,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            },
          }}
        />
      )}
    </Stack>
  )
}
