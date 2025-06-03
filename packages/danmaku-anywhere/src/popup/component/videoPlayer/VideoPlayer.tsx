import { Close, Info, Pause } from '@mui/icons-material'
import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import './VideoPlayer.css'
import { useMouseDelay } from '@/common/hooks/useMouseDelay'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

const TimeDisplay = ({
  currentTime = 0,
  duration = 0,
}: {
  currentTime: number
  duration: number
}) => {
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
  }

  return (
    <div className="vjs-time-display">
      <span className="vjs-current-time">{formatTime(currentTime)}</span>
      <span className="vjs-time-divider"> / </span>
      <span className="vjs-duration">{formatTime(duration)}</span>
    </div>
  )
}

const ControlBarButton = ({
  className,
  title,
  onClick,
  children,
}: {
  className?: string
  title?: string
  onClick?: () => void
  children: ReactNode
}) => {
  return (
    <button
      className={`vjs-control-bar-button ${className || ''}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const PauseIndicator = ({
  visible,
}: {
  visible: boolean
}) => {
  return (
    <div className={`vjs-pause-indicator ${visible ? 'visible' : 'hidden'}`}>
      <div className="pause-icon">
        <Pause fontSize="large" />
      </div>
    </div>
  )
}

const PlaybackSpeedButton = ({
  player,
  rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
}: {
  player: any
  rates?: number[]
}) => {
  const [currentRate, setCurrentRate] = useState(1)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleButtonClick = () => {
    setShowDropdown(!showDropdown)
  }

  const handleRateSelect = (rate: number) => {
    player.playbackRate(rate)
    setCurrentRate(rate)
    setShowDropdown(false)
  }

  return (
    <div className="vjs-playback-speed-container" ref={dropdownRef}>
      <ControlBarButton
        className="vjs-playback-speed-button"
        title="Playback Speed"
        onClick={handleButtonClick}
      >
        {currentRate}x
      </ControlBarButton>

      {showDropdown && (
        <div className="vjs-playback-speed-dropdown">
          {rates.map((rate) => (
            <div
              key={rate}
              className={`vjs-playback-speed-item ${rate === currentRate ? 'active' : ''}`}
              onClick={() => handleRateSelect(rate)}
            >
              {rate}x
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const HoverHeader = ({
  title,
  onInfoClick,
  showInfoButton,
  visible,
}: {
  title: string
  showInfoButton: boolean
  onInfoClick: () => void
  visible: boolean
}) => {
  const show = useMouseDelay({ enabled: visible, timeout: 2000 })

  return (
    <div
      className={`vjs-hover-header ${visible && show ? 'visible' : 'hidden'}`}
    >
      <div className="vjs-title">{title}</div>
      {showInfoButton && (
        <button className="vjs-info-button" onClick={onInfoClick}>
          <Info />
        </button>
      )}
    </div>
  )
}

const StatusText = ({
  message,
  loading,
}: {
  message: string
  loading: boolean
}) => {
  return (
    <div className="vjs-status-text">
      <Typography variant="h6" component="div">
        {message}
      </Typography>
      {loading && <CircularProgress />}
    </div>
  )
}

// Create videojs component containers for portals
const createPortalContainer = (name: string) => {
  const Component = videojs.getComponent('Component')

  class PortalContainer extends Component {
    constructor(player: any, options: any = {}) {
      super(player, options)
      this.addClass(`vjs-portal-${name.toLowerCase()}`)
    }

    createEl() {
      return videojs.dom.createEl('div', {
        className: `vjs-portal-${name.toLowerCase()}`,
      })
    }
  }

  videojs.registerComponent(`Portal${name}`, PortalContainer)
}

type VideoPlayerProps = {
  videoUrl?: string
  videoType?: string
  poster?: string
  title?: string
  statusText?: string
  loading?: boolean
  renderInfo?: () => ReactNode
}

// Register portal containers
createPortalContainer('HoverHeader')
createPortalContainer('StatusText')
createPortalContainer('PlaybackSpeed')
createPortalContainer('PauseIndicator')
createPortalContainer('TimeDisplay')

export const VideoPlayer = ({
  videoUrl,
  videoType,
  poster,
  title,
  statusText,
  loading,
  renderInfo,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<ReturnType<typeof videojs>>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const portalRefs = useRef<{
    hoverHeader: Element | null
    statusText: Element | null
    playbackSpeed: Element | null
    pauseIndicator: Element | null
    timeDisplay: Element | null
  }>({
    hoverHeader: null,
    statusText: null,
    playbackSpeed: null,
    pauseIndicator: null,
    timeDisplay: null,
  })

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleOpenInfo = () => {
    setShowInfo(true)
  }

  useEffect(() => {
    if (!videoRef.current) return
    console.log({ videoUrl })

    // create the player
    console.log('Create player')
    const videoElement = document.createElement('video-js')

    videoRef.current.appendChild(videoElement)

    const player = videojs(videoElement, {
      controls: !!videoUrl, // Only show controls when video is available
      fluid: true,
      poster,
      sources: videoUrl
        ? [
            {
              src: videoUrl,
              type: videoType,
            },
          ]
        : [],
      controlBar: {
        // hide built-in time displays since we're using a custom one
        remainingTimeDisplay: false,
      },
      enableSmoothSeeking: true,
    })

    // Add portal containers
    const hoverHeaderContainer = player.addChild('PortalHoverHeader')
    portalRefs.current.hoverHeader = hoverHeaderContainer.el()

    const statusTextContainer = player.addChild('PortalStatusText')
    portalRefs.current.statusText = statusTextContainer.el()

    // Add pause indicator container
    const pauseIndicatorContainer = player.addChild('PortalPauseIndicator')
    portalRefs.current.pauseIndicator = pauseIndicatorContainer.el()

    // Add playback speed button to control bar
    const controlBar = player.getChild('ControlBar')
    const fullscreenToggle = controlBar?.getChild('FullscreenToggle')

    if (controlBar) {
      if (fullscreenToggle) {
        // add a playback speed button before the fullscreen toggle button
        const playbackSpeedContainer = controlBar.addChild(
          'PortalPlaybackSpeed',
          {},
          controlBar.children().indexOf(fullscreenToggle)
        )
        portalRefs.current.playbackSpeed = playbackSpeedContainer.el()
      }

      // add time display before the progress control
      const progressControl = controlBar.getChild('ProgressControl')
      if (progressControl) {
        const timeDisplayContainer = controlBar.addChild(
          'PortalTimeDisplay',
          {},
          controlBar.children().indexOf(progressControl)
        )
        portalRefs.current.timeDisplay = timeDisplayContainer.el()
      }
    }

    // Add event listeners for pause/play
    player.on('pause', () => {
      setIsPaused(true)
    })

    player.on('play', () => {
      setIsPaused(false)
    })

    // Add event listener for timeupdate
    player.on('timeupdate', () => {
      setCurrentTime(player.currentTime()!)
      setDuration(player.duration()!)
    })

    playerRef.current = player

    return () => {
      const player = playerRef.current

      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
        portalRefs.current = {
          hoverHeader: null,
          statusText: null,
          playbackSpeed: null,
          pauseIndicator: null,
          timeDisplay: null,
        }
      }
    }
  }, [videoUrl, videoType, poster])

  // Render React components inside portal containers
  const renderPortals = () => {
    return (
      <>
        {portalRefs.current.hoverHeader &&
          title &&
          createPortal(
            <HoverHeader
              title={title}
              showInfoButton={!!renderInfo}
              onInfoClick={handleOpenInfo}
              visible={isHovered}
            />,
            portalRefs.current.hoverHeader
          )}

        {portalRefs.current.statusText &&
          (loading !== undefined || statusText) &&
          createPortal(
            <StatusText message={statusText || ''} loading={!!loading} />,
            portalRefs.current.statusText
          )}

        {portalRefs.current.pauseIndicator &&
          createPortal(
            <PauseIndicator visible={isPaused} />,
            portalRefs.current.pauseIndicator
          )}

        {portalRefs.current.playbackSpeed &&
          playerRef.current &&
          createPortal(
            <PlaybackSpeedButton player={playerRef.current} />,
            portalRefs.current.playbackSpeed
          )}

        {portalRefs.current.timeDisplay &&
          createPortal(
            <TimeDisplay currentTime={currentTime} duration={duration} />,
            portalRefs.current.timeDisplay
          )}
      </>
    )
  }

  return (
    <>
      <div
        className="video-player-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Dialog
          open={showInfo}
          onClose={() => setShowInfo(false)}
          fullWidth
          hideBackdrop
          maxWidth="sm"
          disablePortal
          slotProps={{
            paper: {
              sx: {
                background: 'rgba(0, 0, 0, 0.4)',
              },
            },
          }}
        >
          <DialogTitle>
            Video Info
            <IconButton
              sx={{
                float: 'right',
                p: 0,
              }}
              onClick={() => setShowInfo(false)}
              disableRipple
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>{renderInfo?.()}</DialogContent>
        </Dialog>
        <div data-vjs-player={true}>
          <div ref={videoRef} />
        </div>
        {renderPortals()}
      </div>
    </>
  )
}
