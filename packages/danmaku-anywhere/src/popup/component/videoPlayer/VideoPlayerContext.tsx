import type { SelectableEpisode } from '@/common/components/DanmakuSelector/DanmakuSelector'
import type { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import type videojs from 'video.js'

export type VideoJsPlayer = ReturnType<typeof videojs>

export interface VideoPlayerContextType {
  player: VideoJsPlayer | null
  renderer: DanmakuRenderer | null
  isHovering: boolean
  setIsHovering: (isHovering: boolean) => void
  isPaused: boolean
  isMuted: boolean
  isFullscreen: boolean
  isButtonHovering: boolean
  volume: number
  playbackRate: number
  setIsButtonHovering: (isButtonHovering: boolean) => void
  togglePlay: () => void
  toggleMute: () => void
  toggleFullscreen: () => void
  setVolume: (volume: number) => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
  onSelectEpisode: (episode: SelectableEpisode) => void
  menuAnchorEl: null | HTMLElement
  menuId: string
  showButtonMenu: (anchor: HTMLElement | null, id: string) => void
  hideButtonMenu: () => void
  size: [number, number]
  setSize: (size: [number, number]) => void
}

// Create the context with default values
const VideoPlayerContext = createContext<VideoPlayerContextType>({
  player: null,
  renderer: null,
  isHovering: false,
  setIsHovering: () => {
    //
  },
  isPaused: true,
  isMuted: false,
  isFullscreen: false,
  isButtonHovering: false,
  volume: 1,
  playbackRate: 1,
  menuAnchorEl: null,
  menuId: '',
  showButtonMenu: () => {
    //
  },
  hideButtonMenu: () => {
    //
  },
  setIsButtonHovering: () => {
    //
  },
  togglePlay: () => {
    //
  },
  toggleMute: () => {
    //
  },
  toggleFullscreen: () => {
    //
  },
  setVolume: () => {
    //
  },
  seek: () => {
    //
  },
  setPlaybackRate: () => {
    //
  },
  onSelectEpisode: () => {
    //
  },
  size: [0, 0],
  setSize: () => {
    //
  },
})

export const useVideoPlayer = () => useContext(VideoPlayerContext)

interface VideoPlayerProviderProps {
  player: VideoJsPlayer | null
  renderer: DanmakuRenderer
  onSelectEpisode: (episode: SelectableEpisode) => void
  children: ReactNode
}

export const VideoPlayerProvider = ({
  player,
  renderer,
  onSelectEpisode,
  children,
}: VideoPlayerProviderProps) => {
  const [isPaused, setIsPaused] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isButtonHovering, setIsButtonHovering] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuId, setMenuId] = useState<string>('')
  const [size, setSize] = useState<[number, number]>([0, 0])

  useEffect(() => {
    if (!player || player.isDisposed()) return

    const onPlay = () => {
      setIsPaused(false)
    }

    const onPause = () => {
      setIsPaused(true)
    }

    const onVolumeChange = () => {
      setIsMuted(player.muted()!)
      setVolumeState(player.volume()!)
    }

    const onRateChange = () => {
      setPlaybackRateState(player.playbackRate()!)
    }

    const onFullscreenChange = () => {
      if (player.isFullscreen()) {
        setIsFullscreen(true)
      } else {
        setIsFullscreen(false)
      }
    }

    player.on('play', onPlay)
    player.on('pause', onPause)
    player.on('volumechange', onVolumeChange)
    player.on('ratechange', onRateChange)
    player.on('fullscreenchange', onFullscreenChange)

    setIsMuted(player.muted()!)
    setVolumeState(player.volume()!)
    setPlaybackRateState(player.playbackRate()!)
    setIsPaused(player.paused())
    setIsFullscreen(player.isFullscreen()!)

    return () => {
      player.off('play', onPlay)
      player.off('pause', onPause)
      player.off('volumechange', onVolumeChange)
      player.off('ratechange', onRateChange)
      player.off('fullscreenchange', onFullscreenChange)
    }
  }, [player])

  const togglePlay = () => {
    if (!player) return
    if (player.paused()) {
      player.play()
    } else {
      player.pause()
    }
  }

  const toggleMute = () => {
    if (!player) return
    player.muted(!player.muted())
  }

  const toggleFullscreen = () => {
    if (!player) return
    if (player.isFullscreen()) {
      player.exitFullscreen()
    } else {
      player.requestFullscreen()
    }
  }

  const setVolume = (newVolume: number) => {
    if (!player) return
    player.volume(newVolume)
  }

  const seek = (time: number) => {
    if (!player) return
    player.currentTime(time)
  }

  const setPlaybackRate = (rate: number) => {
    if (!player) return
    player.playbackRate(rate)
  }

  const showButtonMenu = (anchor: HTMLElement | null, id: string) => {
    setMenuAnchorEl(anchor)
    setMenuId(id)
  }

  const hideButtonMenu = () => {
    setMenuAnchorEl(null)
    setMenuId('')
  }

  const value = {
    player,
    renderer,
    isHovering,
    setIsHovering,
    isPaused,
    togglePlay,
    isMuted,
    toggleMute,
    isFullscreen,
    toggleFullscreen,
    isButtonHovering,
    setIsButtonHovering,
    volume,
    setVolume,
    seek,
    playbackRate,
    setPlaybackRate,
    onSelectEpisode,
    menuAnchorEl,
    menuId,
    showButtonMenu,
    hideButtonMenu,
    size,
    setSize,
  }

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}
