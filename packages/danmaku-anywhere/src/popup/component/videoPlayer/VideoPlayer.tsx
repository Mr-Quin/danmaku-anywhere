import { Close } from '@mui/icons-material'
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

// Register custom components
const Component = videojs.getComponent('Component')
const Button = videojs.getComponent('Button')

// PlaybackSpeedButton component
class PlaybackSpeedButton extends Button {
  private rates: number[]
  private currentRate: number

  constructor(player: any, options: any = {}) {
    super(player, options)
    this.addClass('vjs-playback-speed-button')
    this.rates = options.rates || [0.5, 1, 1.5, 2]
    this.currentRate = 1
  }

  createEl() {
    const el = videojs.dom.createEl('button', {
      className: 'vjs-playback-speed-button',
      innerHTML: '1x',
      title: 'Playback Speed',
    })
    return el
  }

  handleClick() {
    const currentIndex = this.rates.indexOf(this.currentRate)
    const nextRate = this.rates[(currentIndex + 1) % this.rates.length]
    this.player_.playbackRate(nextRate)
    this.currentRate = nextRate
    this.updateText(nextRate)
  }

  updateText(rate: number) {
    if (this.el_) {
      this.el_.innerHTML = `${rate}x`
    }
  }
}

// HoverHeader component
class HoverHeader extends Component {
  private titleEl: Element | null = null
  private infoButtonEl: Element | null = null
  private visible = false
  private title = ''
  private onInfoClick: (() => void) | null = null

  constructor(player: any, options: any = {}) {
    super(player, options)
    this.title = options.title || ''
    this.onInfoClick = options.onInfoClick || null
    this.addClass('vjs-hover-header')
    this.addClass('hidden')
  }

  createEl() {
    const el = videojs.dom.createEl('div', {
      className: 'vjs-hover-header',
    })

    // Create title element
    this.titleEl = videojs.dom.createEl('div', {
      className: 'vjs-title',
      innerHTML: this.title,
    })
    el.appendChild(this.titleEl)

    // Create info button
    this.infoButtonEl = videojs.dom.createEl('button', {
      className: 'vjs-info-button',
      innerHTML:
        '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path fill="currentColor" d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>',
    })

    if (this.onInfoClick) {
      this.infoButtonEl.addEventListener('click', this.onInfoClick)
    }

    el.appendChild(this.infoButtonEl)

    return el
  }

  updateTitle(title: string) {
    this.title = title
    if (this.titleEl) {
      this.titleEl.innerHTML = title
    }
  }

  show() {
    this.visible = true
    this.removeClass('hidden')
    this.addClass('visible')
  }

  hide() {
    this.visible = false
    this.removeClass('visible')
    this.addClass('hidden')
  }

  dispose() {
    if (this.infoButtonEl && this.onInfoClick) {
      this.infoButtonEl.removeEventListener('click', this.onInfoClick)
    }
    super.dispose()
  }
}

// StatusText component
class StatusText extends Component {
  private messageEl: Element | null = null
  private spinnerEl: Element | null = null
  private message = ''
  private loading = false

  constructor(player: any, options: any = {}) {
    super(player, options)
    this.message = options.message || ''
    this.loading = options.loading || false
    this.addClass('vjs-status-text')
  }

  createEl() {
    const el = videojs.dom.createEl('div', {
      className: 'vjs-status-text',
    })

    // Create message element
    this.messageEl = videojs.dom.createEl('div', {
      className: 'status-message',
      innerHTML: this.message,
    })
    el.appendChild(this.messageEl)

    // Create spinner element
    if (this.loading) {
      this.spinnerEl = videojs.dom.createEl('div', {
        className: 'vjs-loading-spinner',
      })
      el.appendChild(this.spinnerEl)
    }

    return el
  }

  updateMessage(message: string) {
    this.message = message
    if (this.messageEl) {
      this.messageEl.innerHTML = message
    }
  }

  setLoading(loading: boolean) {
    this.loading = loading
    if (loading && !this.spinnerEl && this.el_) {
      this.spinnerEl = videojs.dom.createEl('div', {
        className: 'vjs-loading-spinner',
      })
      this.el_.appendChild(this.spinnerEl)
    } else if (!loading && this.spinnerEl && this.el_) {
      this.el_.removeChild(this.spinnerEl)
      this.spinnerEl = null
    }
  }
}

// Register the components
videojs.registerComponent('PlaybackSpeedButton', PlaybackSpeedButton)
videojs.registerComponent('HoverHeader', HoverHeader)
videojs.registerComponent('StatusText', StatusText)

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
  const hoverHeaderRef = useRef<any>(null)

  const handleMouseEnter = () => {
    if (hoverHeaderRef.current) {
      hoverHeaderRef.current.show()
    }
  }

  const handleMouseLeave = () => {
    if (hoverHeaderRef.current) {
      hoverHeaderRef.current.hide()
    }
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
          'playbackSpeedButton',
          'fullscreenToggle',
        ],
      },
    })

    // Add hover header component
    const hoverHeader = player.addChild('HoverHeader', {
      title: title || '',
      onInfoClick: handleOpenInfo,
    })
    hoverHeaderRef.current = hoverHeader

    // Add status text component if loading or error
    if (loading && statusText) {
      player.addChild('StatusText', {
        message: statusText,
        loading: true,
      })
    } else if (error) {
      player.addChild('StatusText', {
        message: error,
        loading: false,
      })
    }

    playerRef.current = player

    return () => {
      const player = playerRef.current

      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
        hoverHeaderRef.current = null
      }
    }
  }, [videoUrl, videoType, poster, title, statusText, loading, error])

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
      </div>
    </>
  )
}
