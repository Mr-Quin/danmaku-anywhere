import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { useEffect, useState } from 'react'

export const useDuration = () => {
  const { player } = useVideoPlayer()
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!player) return

    const onTimeUpdate = () => {
      setCurrentTime(player.currentTime()!)
    }

    const onDurationChange = () => {
      setDuration(player.duration()!)
    }

    player.on('timeupdate', onTimeUpdate)
    player.on('durationchange', onDurationChange)

    return () => {
      player.off('timeupdate', onTimeUpdate)
      player.off('durationchange', onDurationChange)
    }
  }, [player])

  return {
    currentTime,
    duration,
  }
}
