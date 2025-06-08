import {
  Box,
  Button,
  type ButtonProps,
  ClickAwayListener,
  Paper,
  Popper,
  Tooltip,
  styled,
} from '@mui/material'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'

const StyledControlBarButton = styled(Button)(({ theme }) => ({
  minWidth: 40,
  height: '100%',
  padding: theme.spacing(1),
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
}))

const StyledMenuPaper = styled(Paper)(({ theme }) => ({
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
  padding: theme.spacing(1),
}))

export interface ControlBarButtonProps extends Omit<ButtonProps, 'sx'> {
  children: ReactNode
  sx?: ButtonProps['sx']
  tooltip?: string
  menu?: {
    content: ReactNode
  }
}

export const ControlBarButton = ({
  children,
  sx,
  tooltip,
  menu,
  ...props
}: ControlBarButtonProps) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setMenuAnchorEl(buttonRef.current)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setMenuAnchorEl(null)
    }, 1000)
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (menu) {
      setMenuAnchorEl(menuAnchorEl ? null : event.currentTarget)
    }
    if (props.onClick) {
      props.onClick(event)
    }
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }

  const button = (
    <StyledControlBarButton
      tabIndex={-1}
      ref={buttonRef}
      variant="text"
      disableRipple
      sx={sx}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </StyledControlBarButton>
  )

  const showTooltip = tooltip && !menu

  return (
    <Box>
      {showTooltip ? (
        <Tooltip title={tooltip} arrow placement="top">
          {button}
        </Tooltip>
      ) : (
        button
      )}

      {menu && (
        <Popper
          open={Boolean(menuAnchorEl)}
          anchorEl={menuAnchorEl}
          disablePortal
          placement="top"
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 20],
              },
            },
          ]}
        >
          <ClickAwayListener onClickAway={handleMenuClose}>
            <StyledMenuPaper
              onMouseEnter={handleMenuMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {menu.content}
            </StyledMenuPaper>
          </ClickAwayListener>
        </Popper>
      )}
    </Box>
  )
}
