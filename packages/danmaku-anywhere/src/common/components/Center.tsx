import { Stack } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const Center = ({ children }: PropsWithChildren) => {
  return (
    <Stack
      height={1}
      direction="column"
      justifyContent="center"
      alignItems="center"
    >
      {children}
    </Stack>
  )
}
