import {
  Box,
  Paper,
  Stack,
  type SxProps,
  type Theme,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'

interface SettingsBlockProps {
  title?: ReactNode
  subtitle?: ReactNode
  headerRight?: ReactNode
  disabled?: boolean
  sx?: SxProps<Theme>
  children: ReactNode
}

export function SettingsBlock({
  title,
  subtitle,
  headerRight,
  disabled,
  sx,
  children,
}: SettingsBlockProps) {
  const hasHeader = title || subtitle || headerRight
  return (
    <Paper
      variant="outlined"
      sx={[
        {
          p: 2,
          bgcolor: 'background.paper',
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.default',
          },
        },
        !!disabled && { opacity: 0.7 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {hasHeader && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start', mb: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title && <Typography variant="h5">{title}</Typography>}
            {subtitle && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {headerRight}
        </Stack>
      )}
      {children}
    </Paper>
  )
}
