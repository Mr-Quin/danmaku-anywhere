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
  isPlaying: boolean
  isPaused: boolean
  isMuted: boolean
  volume: number
  currentTime: number
  duration: number
  playbackRate: number
  togglePlay: () => void
  toggleMute: () => void
  setVolume: (volume: number) => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
}

// Create the context with default values
const VideoPlayerContext = createContext<VideoPlayerContextType>({
  player: null,
  isPlaying: false,
  isPaused: true,
  isMuted: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  // biome-ignore lint/suspicious/noEmptyBlockStatements: initial state is empty
  togglePlay: () => {},
  toggleMute: () => {},
  setVolume: () => {},
  seek: () => {},
  setPlaybackRate: () => {},
})

// Create a hook to use the context
export const useVideoPlayer = () => useContext(VideoPlayerContext)

// Create the provider component
interface VideoPlayerProviderProps {
  player: Player | null
  children: ReactNode
}

export const VideoPlayerProvider = ({
  player,
  children,
}: VideoPlayerProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRateState] = useState(1)

  // Set up event listeners when player changes
  useEffect(() => {
    if (!player) return

    const onPlay = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    const onPause = () => {
      setIsPlaying(false)
      setIsPaused(true)
    }

    const onVolumeChange = () => {
      setIsMuted(player.muted())
      setVolumeState(player.volume())
    }

    const onTimeUpdate = () => {
      setCurrentTime(player.currentTime())
    }

    const onDurationChange = () => {
      setDuration(player.duration())
    }

    const onRateChange = () => {
      setPlaybackRateState(player.playbackRate())
    }

    // Add event listeners
    player.on('play', onPlay)
    player.on('pause', onPause)
    player.on('volumechange', onVolumeChange)
    player.on('timeupdate', onTimeUpdate)
    player.on('durationchange', onDurationChange)
    player.on('ratechange', onRateChange)

    // Initialize state from player
    setIsMuted(player.muted())
    setVolumeState(player.volume())
    setPlaybackRateState(player.playbackRate())
    setIsPlaying(!player.paused())
    setIsPaused(player.paused())

    // Clean up event listeners
    return () => {
      player.off('play', onPlay)
      player.off('pause', onPause)
      player.off('volumechange', onVolumeChange)
      player.off('timeupdate', onTimeUpdate)
      player.off('durationchange', onDurationChange)
      player.off('ratechange', onRateChange)
    }
  }, [player])

  // Player control functions
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

  const value = {
    player,
    isPlaying,
    isPaused,
    isMuted,
    volume,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    toggleMute,
    setVolume,
    seek,
    setPlaybackRate,
  }

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}
