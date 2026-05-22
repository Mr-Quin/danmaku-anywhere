import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface ListItemPrimaryStackProps {
  text: string
  children: ReactNode
}

export const ListItemPrimaryStack = ({
  text,
  children,
}: ListItemPrimaryStackProps) => {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        component="span"
        variant="body2"
        noWrap
        title={text}
        sx={{
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        {text}
      </Typography>
      {children}
    </Stack>
  )
}
