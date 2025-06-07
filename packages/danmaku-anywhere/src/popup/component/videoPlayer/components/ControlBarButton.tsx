import { Button, type ButtonProps } from '@mui/material'
import type { ReactNode } from 'react'

interface ControlBarButtonProps extends Omit<ButtonProps, 'sx'> {
  children: ReactNode
  sx?: ButtonProps['sx']
}

export const ControlBarButton = ({
  children,
  sx,
  ...props
}: ControlBarButtonProps) => {
  return (
    <Button
      variant="text"
      disableRipple
      sx={{
        minWidth: 40,
        padding: 1,
        color: 'white',
        backgroundColor: 'transparent',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          textShadow: '0 0 1em white',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
