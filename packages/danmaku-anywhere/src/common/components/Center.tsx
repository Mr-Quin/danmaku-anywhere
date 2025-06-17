import { Stack, type StackProps } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const Center = ({
  children,
  ...rest
}: PropsWithChildren<StackProps>) => {
  return (
    <Stack
      flexGrow={1}
      direction="column"
      justifyContent="center"
      alignItems="center"
      {...rest}
    >
      {children}
    </Stack>
  )
}
