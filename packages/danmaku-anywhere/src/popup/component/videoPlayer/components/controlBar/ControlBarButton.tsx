import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { Box, Button, type ButtonProps, Popper, styled } from '@mui/material'
import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react'
import { PopoverPaper } from './PopoverPaper'
import { StyledTooltip } from './StyledTooltip'

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

export interface ControlBarButtonProps extends ButtonProps {
  children: ReactNode
  tooltip?: string
  buttonId?: string
  menu?: {
    content: ReactNode
  }
}

export const ControlBarButton = ({
  children,
  sx,
  tooltip,
  menu,
  buttonId,
  ...props
}: ControlBarButtonProps) => {
  const {
    setIsButtonHovering,
    menuAnchorEl,
    menuId,
    showButtonMenu,
    hideButtonMenu,
  } = useVideoPlayer()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (hoverTimeoutRef.current) {
      if (menuId !== buttonId) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [menuId, buttonId])

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      setIsButtonHovering(true)
    }
    showButtonMenu(buttonRef.current, buttonId ?? '')
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      hideButtonMenu()
      setIsButtonHovering(false)
    }, 1000)
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (menu) {
      showButtonMenu(menuAnchorEl ? null : buttonRef.current, buttonId ?? '')
    }
    if (props.onClick) {
      props.onClick(e)
    }
  }

  const handleMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      setIsButtonHovering(true)
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
  const showPopper = menu && !!menuAnchorEl && menuId === buttonId

  return (
    <Box>
      {showTooltip ? (
        <StyledTooltip title={tooltip} arrow placement="top">
          {button}
        </StyledTooltip>
      ) : (
        button
      )}

      {showPopper && (
        <Popper
          open={!!menuAnchorEl}
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
          <PopoverPaper
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {menu.content}
          </PopoverPaper>
        </Popper>
      )}
    </Box>
  )
}
