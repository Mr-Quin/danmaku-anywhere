import { GlobalStyles } from '@mui/material'

/**
 * Global styles for videojs components that can't be directly styled with MUI
 * This replaces the need for the VideoPlayer.css file
 */
export const VideoPlayerStyles = () => {
  return (
    <GlobalStyles
      styles={{
        // Big play button styling
        '.video-js .vjs-big-play-button': {
          width: '80px',
          height: '80px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: 'none',
          borderRadius: '50%',
          lineHeight: '80px',
          fontSize: '40px',
          transition: 'all 0.3s',
        },
        '.video-js .vjs-big-play-button:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          transform: 'scale(1.1)',
        },

        // Hide default control bar
        '.video-js .vjs-control-bar': {
          display: 'none !important',
        },

        // Portal container styling
        '.vjs-portal-hoverheader, .vjs-portal-statustext, .vjs-portal-pauseindicator, .vjs-portal-playbackspeed, .vjs-portal-timedisplay, .vjs-portal-controlbar':
          {
            position: 'absolute',
            zIndex: 1,
          },
        '.vjs-portal-hoverheader': {
          top: 0,
          left: 0,
          width: '100%',
        },
        '.vjs-portal-statustext': {
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        },
        '.vjs-portal-pauseindicator': {
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        },
        '.vjs-portal-controlbar': {
          bottom: 0,
          left: 0,
          width: '100%',
        },
      }}
    />
  )
}
