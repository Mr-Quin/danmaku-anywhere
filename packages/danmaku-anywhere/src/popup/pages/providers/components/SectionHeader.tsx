import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  count: number
  children?: ReactNode
}

export const SectionHeader = ({
  title,
  count,
  children,
}: SectionHeaderProps) => {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', gap: 1, pt: 1, pb: 0.5 }}
    >
      <Typography variant="overline" sx={{ flexGrow: 1 }}>
        {title} ({count})
      </Typography>
      {children}
    </Stack>
  )
}
