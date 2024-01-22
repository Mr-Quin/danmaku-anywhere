import { useEffect, useMemo, useState } from 'preact/hooks'

import {
  getEpisodeInfo,
  mediaChangeType,
  PlexMediaInfo,
} from '../plexMediaUtils'

import { useStore } from '@/store/store'

export const useParsePlexMedia = () => {
  const [media, setMedia] = useState<PlexMediaInfo | null>(null)

  const setIsMediaActive = useStore.use.setIsMediaActive()
  const updateMedia = useStore.use.updateMedia()

  const titleElt = document.querySelector('title')

  // observe title change to detect media change
  // and parse the currently playing media
  const titleObserver = useMemo(
    () =>
      new MutationObserver(() => {
        const mediaInfo = getEpisodeInfo()

        if (mediaInfo) {
          setIsMediaActive(true)
          updateMedia({
            meta: {
              key: `${mediaInfo.title} - ${mediaInfo.season}`,
              title: mediaInfo.title,
            },
          })
        } else {
          setIsMediaActive(false)
        }

        setMedia((prevMedia) => {
          // if no media info (regex doesn't match), keep the previous one
          if (!mediaInfo) return prevMedia
          if (!prevMedia) return mediaInfo

          const changeType = mediaChangeType(prevMedia, mediaInfo)
          // if media info is the same, do nothing
          if (changeType === 'none') return prevMedia

          return mediaInfo
        })
      }),
    []
  )

  useEffect(() => {
    if (!titleElt) return

    titleObserver.observe(titleElt, { childList: true })

    return () => {
      titleObserver.disconnect()
    }
  }, [titleElt])

  return media
}
