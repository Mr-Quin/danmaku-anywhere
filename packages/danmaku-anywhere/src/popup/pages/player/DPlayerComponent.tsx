import type { DPlayerOptions } from 'dplayer'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import { useEffect, useRef } from 'react'

type DPlayerComponentProps = Omit<DPlayerOptions, 'container'> & {
  deps?: unknown[]
}

export const DPlayerComponent = ({
  videoUrl,
  picUrl,
  thumbnailsUrl,
  deps,
  ...otherOptions
}: DPlayerComponentProps) => {
  const playerRef = useRef<HTMLDivElement | null>(null)
  const dpInstanceRef = useRef<DPlayer | null>(null)

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: DPlayer requires Hls to be globally available
    ;(window as any).Hls = Hls
    const options: DPlayerOptions = {
      container: playerRef.current,
      video: {
        url: videoUrl,
        type: 'auto',
        pic: picUrl,
        thumbnails: thumbnailsUrl,
      },
      ...otherOptions,
    }

    dpInstanceRef.current = new DPlayer(options)

    return () => {
      if (dpInstanceRef.current) {
        dpInstanceRef.current.destroy()
        dpInstanceRef.current = null
      }
    }
  }, [videoUrl, picUrl, thumbnailsUrl, ...(deps ?? [])])

  return <div ref={playerRef} style={{ width: '100%', height: 'auto' }} />
}
