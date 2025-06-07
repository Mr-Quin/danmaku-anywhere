import { Close } from '@mui/icons-material'
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  styled,
} from '@mui/material'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { VideoPlayerProvider } from './VideoPlayerContext'
import { ControlBar } from './components/ControlBar'
import { HoverHeader } from './components/HoverHeader'
import { PauseIndicator } from './components/PauseIndicator'
import { StatusText } from './components/StatusText'

type VideoJsPlayer = ReturnType<typeof videojs>

const createPortalContainer = (name: string) => {
  const Component = videojs.getComponent('Component')

  class PortalContainer extends Component {
    constructor(player: VideoJsPlayer, options = {}) {
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

createPortalContainer('HoverHeader')
createPortalContainer('StatusText')
createPortalContainer('PauseIndicator')
createPortalContainer('ControlBar')

const VideoPlayerWrapper = styled(Box)(() => ({
  position: 'relative',
  isolation: 'isolate',
  contain: 'layout',
  color: 'white',
}))

const PlayerContainer = styled(Box)({
  '&[data-vjs-player="true"]': {
    width: '100%',
    height: 'auto',
  },
})

const VideoContainer = styled(Box)({
  width: '100%',
  height: 'auto',
})

type VideoPlayerProps = {
  videoUrl?: string
  videoType?: string
  poster?: string
  title?: string
  statusText?: string
  loading?: boolean
  renderInfo?: () => ReactNode
}

export const VideoPlayer = ({
  videoUrl,
  videoType,
  poster,
  title,
  statusText,
  loading,
  renderInfo,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const playerRef = useRef<VideoJsPlayer>(null)
  const [playerInst, setPlayerInst] = useState<VideoJsPlayer | null>(null)

  const [showInfo, setShowInfo] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const portalRefs = useRef<{
    hoverHeader: Element | null
    statusText: Element | null
    playbackSpeed: Element | null
    pauseIndicator: Element | null
    timeDisplay: Element | null
    controlBar: Element | null
  }>({
    hoverHeader: null,
    statusText: null,
    playbackSpeed: null,
    pauseIndicator: null,
    timeDisplay: null,
    controlBar: null,
  })

  useEffect(() => {
    if (!containerRef.current) return

    const videoElement = document.createElement('video-js')

    containerRef.current.appendChild(videoElement)

    const player = videojs(videoElement, {
      controls: false,
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
      enableSmoothSeeking: true,
    })

    playerRef.current = player
    setPlayerInst(player)

    return () => {
      const player = playerRef.current

      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
        setPlayerInst(null)
        portalRefs.current = {
          hoverHeader: null,
          statusText: null,
          playbackSpeed: null,
          pauseIndicator: null,
          timeDisplay: null,
          controlBar: null,
        }
      }
    }
  }, [videoUrl, videoType, poster])

  useEffect(() => {
    if (!playerInst) return

    const hoverHeaderContainer = playerInst.addChild('PortalHoverHeader')
    portalRefs.current.hoverHeader = hoverHeaderContainer.el()

    const statusTextContainer = playerInst.addChild('PortalStatusText')
    portalRefs.current.statusText = statusTextContainer.el()

    const pauseIndicatorContainer = playerInst.addChild('PortalPauseIndicator')
    portalRefs.current.pauseIndicator = pauseIndicatorContainer.el()

    const controlBarContainer = playerInst.addChild('PortalControlBar')
    portalRefs.current.controlBar = controlBarContainer.el()
  }, [playerInst])

  const isReady = !!videoUrl && !!videoType

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleOpenInfo = () => {
    setShowInfo(true)
  }

  const renderPortals = () => {
    if (!playerInst) return null

    return (
      <VideoPlayerProvider player={playerInst}>
        {portalRefs.current.hoverHeader &&
          isReady &&
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
          (loading || statusText) &&
          createPortal(
            <StatusText message={statusText || ''} loading={!!loading} />,
            portalRefs.current.statusText
          )}

        {portalRefs.current.pauseIndicator &&
          isReady &&
          createPortal(<PauseIndicator />, portalRefs.current.pauseIndicator)}

        {portalRefs.current.controlBar &&
          isReady &&
          createPortal(
            <ControlBar visible={isHovered} />,
            portalRefs.current.controlBar
          )}
      </VideoPlayerProvider>
    )
  }

  return (
    <>
      {/*<VideoPlayerStyles />*/}
      <VideoPlayerWrapper
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
        <PlayerContainer data-vjs-player={true}>
          <VideoContainer ref={containerRef} />
        </PlayerContainer>
        {renderPortals()}
      </VideoPlayerWrapper>
    </>
  )
}
