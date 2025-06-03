import { Close, Info } from '@mui/icons-material'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import './VideoPlayer.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Create React components for portals
const PlaybackSpeedButton = ({
  player,
  rates = [0.5, 1, 1.5, 2],
}: {
  player: any
  rates?: number[]
}) => {
  const [currentRate, setCurrentRate] = useState(1)

  const handleClick = () => {
    const currentIndex = rates.indexOf(currentRate)
    const nextRate = rates[(currentIndex + 1) % rates.length]
    player.playbackRate(nextRate)
    setCurrentRate(nextRate)
  }

  return (
    <button
      className="vjs-playback-speed-button"
      title="Playback Speed"
      onClick={handleClick}
    >
      {currentRate}x
    </button>
  )
}

const HoverHeader = ({
  title,
  onInfoClick,
  visible,
}: {
  title: string
  onInfoClick: () => void
  visible: boolean
}) => {
  return (
    <div className={`vjs-hover-header ${visible ? 'visible' : 'hidden'}`}>
      <div className="vjs-title">{title}</div>
      <button className="vjs-info-button" onClick={onInfoClick}>
        <Info />
      </button>
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
      <div className="status-message">{message}</div>
      {loading && <div className="vjs-loading-spinner"></div>}
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
  pageUrl?: string
  loading?: boolean
  error?: string
}

// Register portal containers
createPortalContainer('HoverHeader')
createPortalContainer('StatusText')
createPortalContainer('PlaybackSpeed')

export const VideoPlayer = ({
  videoUrl,
  videoType,
  poster,
  title,
  statusText,
  pageUrl,
  loading,
  error,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<ReturnType<typeof videojs>>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Refs for portal containers
  const hoverHeaderPortalRef = useRef<Element | null>(null)
  const statusTextPortalRef = useRef<Element | null>(null)
  const playbackSpeedPortalRef = useRef<Element | null>(null)

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
    videoElement.classList.add('vjs-big-play-centered')
    videoRef.current.appendChild(videoElement)

    const player = videojs(videoElement, {
      controls: true,
      fluid: true,
      poster,
      sources: [
        {
          src: videoUrl,
          type: videoType,
        },
      ],
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'progressControl',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'fullscreenToggle',
        ],
      },
    })

    // Add portal containers
    const hoverHeaderContainer = player.addChild('PortalHoverHeader')
    hoverHeaderPortalRef.current = hoverHeaderContainer.el()

    const statusTextContainer = player.addChild('PortalStatusText')
    statusTextPortalRef.current = statusTextContainer.el()

    // Add playback speed button to control bar
    const controlBar = player.getChild('ControlBar')
    const fullscreenToggle = controlBar?.getChild('FullscreenToggle')

    if (controlBar && fullscreenToggle) {
      const playbackSpeedContainer = controlBar.addChild(
        'PortalPlaybackSpeed',
        {},
        controlBar.children().indexOf(fullscreenToggle)
      )
      playbackSpeedPortalRef.current = playbackSpeedContainer.el()
    }

    playerRef.current = player

    return () => {
      const player = playerRef.current

      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
        hoverHeaderPortalRef.current = null
        statusTextPortalRef.current = null
        playbackSpeedPortalRef.current = null
      }
    }
  }, [videoUrl, videoType, poster, title, statusText, loading, error])

  // Render React components inside portal containers
  const renderPortals = () => {
    return (
      <>
        {hoverHeaderPortalRef.current &&
          title &&
          createPortal(
            <HoverHeader
              title={title}
              onInfoClick={handleOpenInfo}
              visible={isHovered}
            />,
            hoverHeaderPortalRef.current
          )}

        {statusTextPortalRef.current &&
          ((loading && statusText) || error) &&
          createPortal(
            <StatusText
              message={loading ? statusText || '' : error || ''}
              loading={!!loading}
            />,
            statusTextPortalRef.current
          )}

        {playbackSpeedPortalRef.current &&
          playerRef.current &&
          createPortal(
            <PlaybackSpeedButton player={playerRef.current} />,
            playbackSpeedPortalRef.current
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
          <DialogContent>
            {videoUrl && (
              <>
                <Typography>Video URL</Typography>
                <Typography>{videoUrl}</Typography>
              </>
            )}
            {pageUrl && (
              <>
                <Typography>Page url</Typography>
                <Typography>{pageUrl}</Typography>
              </>
            )}
          </DialogContent>
        </Dialog>
        <div data-vjs-player={true}>
          <div ref={videoRef} />
        </div>
        {renderPortals()}
      </div>
    </>
  )
}
