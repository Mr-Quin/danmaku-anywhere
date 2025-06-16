import { Info } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'

interface HoverHeaderProps {
  title: string
  showInfoButton?: boolean
  onInfoClick?: () => void
}

export const VideoHeader = ({
  title,
  showInfoButton = false,
  onInfoClick,
}: HoverHeaderProps) => {
  return (
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
  )
}
