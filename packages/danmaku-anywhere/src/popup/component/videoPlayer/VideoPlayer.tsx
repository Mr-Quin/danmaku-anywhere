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
import './VideoPlayer.css'
import type { SelectableEpisode } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { DanmakuComponent } from '@/content/player/monitors/DanmakuComponent'
import {
  VideoChildren,
  type VideoChildrenRenderProp,
} from '@/popup/component/videoPlayer/components/VideoChildren'
import { VideoPlayerWrapper } from '@/popup/component/videoPlayer/components/VideoPlayerWrapper'
import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import type { ReactNode } from 'react'
import { createElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactDOM from 'react-dom/client'
import { type VideoJsPlayer, VideoPlayerProvider } from './VideoPlayerContext'
import { FadeContainer } from './components/FadeContainer'
import { PauseIndicator } from './components/PauseIndicator'
import { StatusText } from './components/StatusText'

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

createPortalContainer('HeaderControlBar')
createPortalContainer('StatusText')
createPortalContainer('PauseIndicator')
createPortalContainer('Children')
createPortalContainer('Danmaku')

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
  onSelectEpisode: (episode: SelectableEpisode) => void
  comments?: CommentEntity[]
  children?: ReactNode | VideoChildrenRenderProp
}

export const VideoPlayer = ({
  videoUrl,
  videoType,
  poster,
  title,
  statusText,
  loading,
  renderInfo,
  comments,
  onSelectEpisode,
  children,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<DanmakuRenderer>(
    new DanmakuRenderer((node, props) => {
      ReactDOM.createRoot(node).render(createElement(DanmakuComponent, props))
    })
  )
  const [playerInst, setPlayerInst] = useState<VideoJsPlayer | null>(null)

  const [showInfo, setShowInfo] = useState(false)

  const portalRefs = useRef<{
    headerControlBar: Element | null
    statusText: Element | null
    playbackSpeed: Element | null
    pauseIndicator: Element | null
    timeDisplay: Element | null
    children: Element | null
    danmaku: Element | null
  }>({
    headerControlBar: null,
    statusText: null,
    playbackSpeed: null,
    pauseIndicator: null,
    timeDisplay: null,
    children: null,
    danmaku: null,
  })

  const createContainers = (playerInst: VideoJsPlayer) => {
    // the order of creation here determines their order in the dom
    const danmakuContainer = playerInst.addChild('PortalDanmaku')
    portalRefs.current.danmaku = danmakuContainer.el()

    const statusTextContainer = playerInst.addChild('PortalStatusText')
    portalRefs.current.statusText = statusTextContainer.el()

    const pauseIndicatorContainer = playerInst.addChild('PortalPauseIndicator')
    portalRefs.current.pauseIndicator = pauseIndicatorContainer.el()

    const headerControlBarContainer = playerInst.addChild(
      'PortalHeaderControlBar'
    )
    portalRefs.current.headerControlBar = headerControlBarContainer.el()

    const childrenContainer = playerInst.addChild('PortalChildren')
    portalRefs.current.children = childrenContainer.el()
  }

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

    setPlayerInst(player)
    createContainers(player)

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose()
        setPlayerInst(null)
        portalRefs.current = {
          headerControlBar: null,
          statusText: null,
          playbackSpeed: null,
          pauseIndicator: null,
          timeDisplay: null,
          children: null,
          danmaku: null,
        }
      }
    }
  }, [videoUrl, videoType, poster])

  useEffect(() => {
    if (!playerInst || !comments || !portalRefs.current.danmaku) return

    const videoElt = playerInst.el().querySelector('video')!

    rendererRef.current.create(
      portalRefs.current.danmaku as HTMLElement,
      videoElt,
      comments
    )

    const handleResize = () => {
      rendererRef.current.resize()
    }

    const obs = new ResizeObserver(() => {
      handleResize()
    })

    danmakuOptionsService.get().then((options) => {
      rendererRef.current.updateConfig(options)
    })
    const unsubscribe = danmakuOptionsService.onChange((options) => {
      rendererRef.current.updateConfig(options)
    })

    playerInst.on('fullscreenchange', handleResize)
    obs.observe(videoElt)

    return () => {
      rendererRef.current.destroy()
      playerInst.off('fullscreenchange', handleResize)
      obs.unobserve(videoElt)
      unsubscribe()
    }
  }, [playerInst, comments])

  const isReady = !!videoUrl && !!videoType

  const handleOpenInfo = () => {
    setShowInfo(true)
  }

  const renderPortals = () => {
    if (!playerInst) return null

    return (
      <>
        {portalRefs.current.children &&
          children &&
          createPortal(
            <VideoChildren>{children}</VideoChildren>,
            portalRefs.current.children
          )}

        {portalRefs.current.headerControlBar &&
          isReady &&
          createPortal(
            <FadeContainer
              title={title}
              showInfoButton={!!renderInfo}
              onInfoClick={handleOpenInfo}
            />,
            portalRefs.current.headerControlBar
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
      </>
    )
  }

  return (
    <>
      <VideoPlayerProvider
        player={playerInst}
        renderer={rendererRef.current}
        onSelectEpisode={onSelectEpisode}
      >
        <VideoPlayerWrapper>
          <PlayerContainer data-vjs-player={true}>
            <VideoContainer ref={containerRef} />
          </PlayerContainer>
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
          {renderPortals()}
        </VideoPlayerWrapper>
      </VideoPlayerProvider>
    </>
  )
}
