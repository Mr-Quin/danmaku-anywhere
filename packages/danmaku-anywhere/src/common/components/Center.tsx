import { Stack } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const Center = ({ children }: PropsWithChildren) => {
  return (
    <Stack
      direction="column"
      sx={{
        height: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </Stack>
  )
}
