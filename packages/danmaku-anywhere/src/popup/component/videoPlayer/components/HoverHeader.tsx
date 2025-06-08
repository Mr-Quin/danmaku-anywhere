import { useMouseDelay } from '@/common/hooks/useMouseDelay'
import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { Info } from '@mui/icons-material'
import { Box, Fade, IconButton, Typography } from '@mui/material'
import {} from 'react'

interface HoverHeaderProps {
  title: string
  showInfoButton?: boolean
  onInfoClick?: () => void
  visible: boolean
}

export const HoverHeader = ({
  title,
  showInfoButton = false,
  onInfoClick,
  visible,
}: HoverHeaderProps) => {
  const { isHovering } = useVideoPlayer()

  const show = useMouseDelay({ enabled: visible, timeout: 2000 })

  return (
    <Fade in={visible && (show || isHovering)} timeout={300}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0) 15%, rgba(0, 0, 0, 0.7) 100%)',
          boxSizing: 'border-box',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>

        {showInfoButton && onInfoClick && (
          <IconButton
            onClick={onInfoClick}
            disableRipple
            sx={{
              color: 'white',
              padding: '8px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Info />
          </IconButton>
        )}
      </Box>
    </Fade>
  )
}
