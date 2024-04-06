import { Divider, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface PageToolbarProps extends PropsWithChildren {
  title: string
}

export const TabToolbar = ({ title, children }: PageToolbarProps) => {
  return (
    <>
      <Toolbar>
        <Typography variant="h2" fontSize={18} sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {children}
      </Toolbar>
      <Divider />
    </>
  )
}
