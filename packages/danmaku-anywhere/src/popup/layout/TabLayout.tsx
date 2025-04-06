import type { BoxProps } from '@mui/material'
import { Box } from '@mui/material'
import { type PropsWithChildren, forwardRef } from 'react'

type TabLayoutProps = PropsWithChildren & BoxProps

export const TabLayout = forwardRef(
  ({ children, ...rest }: TabLayoutProps, ref) => {
    return (
      <Box
        flexGrow={1}
        position="relative"
        overflow="auto"
        display="flex"
        flexDirection="column"
        {...rest}
        ref={ref}
      >
        {children}
      </Box>
    )
  }
)

TabLayout.displayName = 'TabLayout'
