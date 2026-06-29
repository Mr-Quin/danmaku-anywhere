import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface BuildRowShellProps {
  tag: string
  chips?: ReactNode
  meta?: ReactNode
  error?: string
  actions: ReactNode
}

export function BuildRowShell({
  tag,
  chips,
  meta,
  error,
  actions,
}: BuildRowShellProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
          >
            {tag}
          </Typography>
          {chips}
        </Stack>
        {meta ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.25 }}
          >
            {meta}
          </Typography>
        ) : null}
        {error ? (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {error}
          </Typography>
        ) : null}
      </Box>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', flexShrink: 0 }}
      >
        {actions}
      </Stack>
    </Box>
  )
}
