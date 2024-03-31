import { Divider, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface PageToolbarProps extends PropsWithChildren {
  title: string
}

export const PageToolbar = ({ title, children }: PageToolbarProps) => {
  return (
    <>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {children}
      </Toolbar>
      <Divider />
    </>
  )
}
