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

type Player = ReturnType<typeof videojs>

interface VideoPlayerContextType {
  player: Player | null
  renderer: DanmakuRenderer | null
  isHovering: boolean
  isPaused: boolean
  isMuted: boolean
  isSeeking: boolean
  isFullscreen: boolean
  isButtonHovering: boolean
  volume: number
  currentTime: number
  duration: number
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
}

// Create the context with default values
const VideoPlayerContext = createContext<VideoPlayerContextType>({
  player: null,
  renderer: null,
  isHovering: false,
  isPaused: true,
  isMuted: false,
  isSeeking: false,
  isFullscreen: false,
  isButtonHovering: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
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
})

export const useVideoPlayer = () => useContext(VideoPlayerContext)

interface VideoPlayerProviderProps {
  player: Player | null
  renderer: DanmakuRenderer
  onSelectEpisode: (episode: SelectableEpisode) => void
  isHovering: boolean
  children: ReactNode
}

export const VideoPlayerProvider = ({
  player,
  renderer,
  onSelectEpisode,
  isHovering,
  children,
}: VideoPlayerProviderProps) => {
  const [isPaused, setIsPaused] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isButtonHovering, setIsButtonHovering] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuId, setMenuId] = useState<string>('')

  useEffect(() => {
    if (!player) return

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

    const onTimeUpdate = () => {
      setCurrentTime(player.currentTime()!)
    }

    const onDurationChange = () => {
      setDuration(player.duration()!)
    }

    const onRateChange = () => {
      setPlaybackRateState(player.playbackRate()!)
    }

    const onSeeking = () => {
      setIsSeeking(true)
    }

    const onSeeked = () => {
      setIsSeeking(false)
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
    player.on('timeupdate', onTimeUpdate)
    player.on('durationchange', onDurationChange)
    player.on('ratechange', onRateChange)
    player.on('seeking', onSeeking)
    player.on('seeked', onSeeked)
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
      player.off('timeupdate', onTimeUpdate)
      player.off('durationchange', onDurationChange)
      player.off('ratechange', onRateChange)
      player.off('seeking', onSeeking)
      player.off('seeked', onSeeked)
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
    isPaused,
    togglePlay,
    isMuted,
    toggleMute,
    isSeeking,
    isFullscreen,
    toggleFullscreen,
    isButtonHovering,
    setIsButtonHovering,
    volume,
    setVolume,
    currentTime,
    seek,
    duration,
    playbackRate,
    setPlaybackRate,
    onSelectEpisode,
    menuAnchorEl,
    menuId,
    showButtonMenu,
    hideButtonMenu,
  }

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}
