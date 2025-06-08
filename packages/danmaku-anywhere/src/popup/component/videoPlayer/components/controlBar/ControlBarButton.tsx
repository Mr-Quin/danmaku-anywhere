import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { Box, Button, type ButtonProps, Popper, styled } from '@mui/material'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'
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
  const { setIsHovering } = useVideoPlayer()
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      setIsHovering(true)
    }
    setMenuAnchorEl(buttonRef.current)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setMenuAnchorEl(null)
      setIsHovering(false)
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

  const handleMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      setIsHovering(true)
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
        <StyledTooltip title={tooltip} arrow placement="top">
          {button}
        </StyledTooltip>
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
